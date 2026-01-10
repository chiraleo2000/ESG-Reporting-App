import { Request, Response } from 'express';
import { db } from '../config/database';
import { generateId } from '../utils/helpers';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import type { AuditAction } from '../types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Audit log helper
async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details: object,
  projectId: string
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, project_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [generateId(), userId, projectId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

/**
 * Upload a file
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const file = req.file;

  if (!file) {
    throw new BadRequestError('No file provided');
  }

  const fileId = generateId();
  const fileExtension = path.extname(file.originalname);
  const storedFileName = `${fileId}${fileExtension}`;
  const filePath = path.join(UPLOAD_DIR, projectId, storedFileName);

  // Create project upload directory
  const projectUploadDir = path.join(UPLOAD_DIR, projectId);
  if (!fs.existsSync(projectUploadDir)) {
    fs.mkdirSync(projectUploadDir, { recursive: true });
  }

  // Move file to project directory
  fs.renameSync(file.path, filePath);

  // Save file record to database
  await db.query(
    `INSERT INTO files (id, project_id, original_name, stored_name, mime_type, size, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [fileId, projectId, file.originalname, storedFileName, file.mimetype, file.size, userId]
  );

  await logAudit(userId, 'UPLOAD', 'file', fileId, { fileName: file.originalname }, projectId);

  res.status(201).json({
    success: true,
    data: {
      id: fileId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    },
  });
}

/**
 * Get all files for a project
 */
export async function getFiles(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const result = await db.query(
    `SELECT f.*, u.name as uploaded_by_name
     FROM files f
     LEFT JOIN users u ON f.uploaded_by = u.id
     WHERE f.project_id = $1
     ORDER BY f.created_at DESC`,
    [projectId]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      uploadedBy: row.uploaded_by_name,
      createdAt: row.created_at,
    })),
  });
}

/**
 * Download a file
 */
export async function downloadFile(req: Request, res: Response): Promise<void> {
  const { projectId, fileId } = req.params;

  const result = await db.query(
    `SELECT * FROM files WHERE id = $1 AND project_id = $2`,
    [fileId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = result.rows[0];
  const filePath = path.join(UPLOAD_DIR, projectId, file.stored_name);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('File not found on disk');
  }

  res.download(filePath, file.original_name);
}

/**
 * Delete a file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  const { projectId, fileId } = req.params;
  const userId = req.user!.id;

  const result = await db.query(
    `DELETE FROM files WHERE id = $1 AND project_id = $2 RETURNING *`,
    [fileId, projectId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = result.rows[0];
  const filePath = path.join(UPLOAD_DIR, projectId, file.stored_name);

  // Delete file from disk
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await logAudit(userId, 'DELETE', 'file', fileId, { fileName: file.original_name }, projectId);

  res.json({
    success: true,
    message: 'File deleted successfully',
  });
}

/**
 * Parse Excel file and import activities
 */
export async function parseExcelActivities(req: Request, res: Response): Promise<void> {
  const { projectId, fileId } = req.params;
  const userId = req.user!.id;

  const fileResult = await db.query(
    `SELECT * FROM files WHERE id = $1 AND project_id = $2`,
    [fileId, projectId]
  );

  if (fileResult.rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = fileResult.rows[0];
  const filePath = path.join(UPLOAD_DIR, projectId, file.stored_name);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('File not found on disk');
  }

  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Parse and validate rows
  const activities: any[] = [];
  const errors: any[] = [];

  for (let i = 0; i < data.length; i++) {
    const row: any = data[i];
    try {
      const activity = parseActivityRow(row, i + 2); // +2 for header row and 1-based index
      activities.push(activity);
    } catch (error: any) {
      errors.push({
        row: i + 2,
        error: error.message,
        data: row,
      });
    }
  }

  // Return parsed data for preview (not yet saved)
  res.json({
    success: true,
    data: {
      parsed: activities,
      errors,
      summary: {
        total: data.length,
        valid: activities.length,
        invalid: errors.length,
      },
    },
  });
}

/**
 * Import activities from parsed Excel data
 */
export async function importExcelActivities(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const { activities } = req.body;

  if (!Array.isArray(activities) || activities.length === 0) {
    throw new BadRequestError('Activities array is required');
  }

  const createdActivities: any[] = [];
  const errors: any[] = [];

  await db.transaction(async (client) => {
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      try {
        const activityId = generateId();
        const result = await client.query(
          `INSERT INTO activities (
            id, project_id, name, description, scope, scope3_category,
            activity_type, quantity, unit, source, tier_level, tier_direction,
            data_source, data_quality_score
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id, name`,
          [
            activityId,
            projectId,
            activity.name,
            activity.description || null,
            activity.scope,
            activity.scope3Category || null,
            activity.activityType,
            activity.quantity,
            activity.unit,
            activity.source || null,
            activity.tierLevel || 'tier1',
            activity.tierDirection || 'both',
            activity.dataSource || 'excel_import',
            activity.dataQualityScore || null,
          ]
        );
        createdActivities.push(result.rows[0]);
      } catch (error: any) {
        errors.push({ index: i, name: activity.name, error: error.message });
      }
    }
  });

  await logAudit(userId, 'IMPORT', 'activity', null, { count: createdActivities.length, source: 'excel' }, projectId);

  res.status(201).json({
    success: true,
    data: {
      imported: createdActivities.length,
      errors,
      summary: {
        total: activities.length,
        imported: createdActivities.length,
        failed: errors.length,
      },
    },
  });
}

/**
 * Export activities to Excel
 */
export async function exportActivitiesToExcel(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;
  const { scope } = req.query;

  let whereClause = 'WHERE project_id = $1';
  const params: any[] = [projectId];

  if (scope) {
    whereClause += ' AND scope = $2';
    params.push(scope);
  }

  const result = await db.query(
    `SELECT * FROM activities ${whereClause} ORDER BY scope, created_at`,
    params
  );

  // Transform data for Excel
  const excelData = result.rows.map((row) => ({
    Name: row.name,
    Description: row.description,
    Scope: row.scope,
    'Scope 3 Category': row.scope3_category,
    'Activity Type': row.activity_type,
    Quantity: row.quantity,
    Unit: row.unit,
    Source: row.source,
    'Tier Level': row.tier_level,
    'Tier Direction': row.tier_direction,
    'Calculation Status': row.calculation_status,
    'Total Emissions (kg CO2e)': row.total_emissions_kg_co2e,
    'Emission Factor Used': row.emission_factor_used,
    'Data Source': row.data_source,
    'Data Quality Score': row.data_quality_score,
    'Created At': row.created_at,
    'Updated At': row.updated_at,
  }));

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 30 }, // Name
    { wch: 40 }, // Description
    { wch: 10 }, // Scope
    { wch: 30 }, // Scope 3 Category
    { wch: 20 }, // Activity Type
    { wch: 15 }, // Quantity
    { wch: 10 }, // Unit
    { wch: 20 }, // Source
    { wch: 12 }, // Tier Level
    { wch: 15 }, // Tier Direction
    { wch: 18 }, // Calculation Status
    { wch: 25 }, // Total Emissions
    { wch: 20 }, // Emission Factor Used
    { wch: 15 }, // Data Source
    { wch: 18 }, // Data Quality Score
    { wch: 20 }, // Created At
    { wch: 20 }, // Updated At
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Activities');

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Get project name for filename
  const projectResult = await db.query(
    `SELECT name FROM projects WHERE id = $1`,
    [projectId]
  );
  const projectName = projectResult.rows[0]?.name || 'project';
  const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeProjectName}_activities_${timestamp}.xlsx"`);
  res.send(buffer);
}

/**
 * Get Excel template for activity import
 */
export async function getActivityTemplate(req: Request, res: Response): Promise<void> {
  // Create template with headers and example data
  const templateData = [
    {
      Name: 'Example: Natural Gas Combustion',
      Description: 'On-site natural gas boiler',
      Scope: 'scope1',
      'Scope 3 Category': '',
      'Activity Type': 'stationary_combustion',
      Quantity: 1000,
      Unit: 'm3',
      Source: 'Utility bills',
      'Tier Level': 'tier1',
      'Tier Direction': 'both',
      'Data Source': 'invoice',
      'Data Quality Score': 'high',
    },
    {
      Name: 'Example: Grid Electricity',
      Description: 'Purchased electricity for facility',
      Scope: 'scope2',
      'Scope 3 Category': '',
      'Activity Type': 'purchased_electricity',
      Quantity: 50000,
      Unit: 'kWh',
      Source: 'Electricity provider',
      'Tier Level': 'tier1',
      'Tier Direction': 'both',
      'Data Source': 'invoice',
      'Data Quality Score': 'high',
    },
    {
      Name: 'Example: Business Travel',
      Description: 'Employee flights',
      Scope: 'scope3',
      'Scope 3 Category': 'business_travel',
      'Activity Type': 'air_travel',
      Quantity: 10000,
      Unit: 'km',
      Source: 'Travel agency reports',
      'Tier Level': 'tier2',
      'Tier Direction': 'upstream',
      'Data Source': 'estimate',
      'Data Quality Score': 'medium',
    },
  ];

  // Create workbook with template
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 40 },
    { wch: 10 },
    { wch: 30 },
    { wch: 25 },
    { wch: 15 },
    { wch: 10 },
    { wch: 25 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Activities Template');

  // Add instructions sheet
  const instructions = [
    { Field: 'Name', Description: 'Name of the activity (required)', 'Valid Values': 'Any text' },
    { Field: 'Description', Description: 'Detailed description (optional)', 'Valid Values': 'Any text' },
    { Field: 'Scope', Description: 'Emission scope (required)', 'Valid Values': 'scope1, scope2, scope3' },
    { Field: 'Scope 3 Category', Description: 'Category for Scope 3 (required if scope3)', 'Valid Values': 'See Scope 3 Categories sheet' },
    { Field: 'Activity Type', Description: 'Type of activity (required)', 'Valid Values': 'stationary_combustion, mobile_combustion, process_emissions, fugitive_emissions, purchased_electricity, purchased_heat_steam, etc.' },
    { Field: 'Quantity', Description: 'Amount of activity (required)', 'Valid Values': 'Numeric value' },
    { Field: 'Unit', Description: 'Unit of measurement (required)', 'Valid Values': 'kWh, MWh, m3, L, kg, tonnes, km, miles, etc.' },
    { Field: 'Source', Description: 'Data source reference (optional)', 'Valid Values': 'Any text' },
    { Field: 'Tier Level', Description: 'Calculation tier (optional)', 'Valid Values': 'tier1, tier2, tier2plus' },
    { Field: 'Tier Direction', Description: 'Upstream/downstream direction (optional)', 'Valid Values': 'upstream, downstream, both' },
    { Field: 'Data Source', Description: 'Origin of data (optional)', 'Valid Values': 'invoice, estimate, calculation, measured, default' },
    { Field: 'Data Quality Score', Description: 'Quality assessment (optional)', 'Valid Values': 'high, medium, low' },
  ];

  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Add Scope 3 categories sheet
  const scope3Categories = [
    { Category: 'purchased_goods', Direction: 'upstream', Description: 'Category 1 - Purchased goods and services' },
    { Category: 'capital_goods', Direction: 'upstream', Description: 'Category 2 - Capital goods' },
    { Category: 'fuel_energy', Direction: 'upstream', Description: 'Category 3 - Fuel and energy-related activities' },
    { Category: 'upstream_transport', Direction: 'upstream', Description: 'Category 4 - Upstream transportation and distribution' },
    { Category: 'waste', Direction: 'upstream', Description: 'Category 5 - Waste generated in operations' },
    { Category: 'business_travel', Direction: 'upstream', Description: 'Category 6 - Business travel' },
    { Category: 'employee_commuting', Direction: 'upstream', Description: 'Category 7 - Employee commuting' },
    { Category: 'upstream_leased', Direction: 'upstream', Description: 'Category 8 - Upstream leased assets' },
    { Category: 'downstream_transport', Direction: 'downstream', Description: 'Category 9 - Downstream transportation and distribution' },
    { Category: 'processing', Direction: 'downstream', Description: 'Category 10 - Processing of sold products' },
    { Category: 'use_of_products', Direction: 'downstream', Description: 'Category 11 - Use of sold products' },
    { Category: 'end_of_life', Direction: 'downstream', Description: 'Category 12 - End-of-life treatment of sold products' },
    { Category: 'downstream_leased', Direction: 'downstream', Description: 'Category 13 - Downstream leased assets' },
    { Category: 'franchises', Direction: 'downstream', Description: 'Category 14 - Franchises' },
    { Category: 'investments', Direction: 'downstream', Description: 'Category 15 - Investments' },
  ];

  const categoriesSheet = XLSX.utils.json_to_sheet(scope3Categories);
  categoriesSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Scope 3 Categories');

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="activity_import_template.xlsx"');
  res.send(buffer);
}

// Helper function to parse activity row from Excel
function parseActivityRow(row: any, rowNumber: number): any {
  const name = row['Name'] || row['name'];
  if (!name) {
    throw new Error(`Row ${rowNumber}: Name is required`);
  }

  const scope = (row['Scope'] || row['scope'] || '').toLowerCase().trim();
  if (!['scope1', 'scope2', 'scope3'].includes(scope)) {
    throw new Error(`Row ${rowNumber}: Invalid scope "${scope}". Must be scope1, scope2, or scope3`);
  }

  const quantity = parseFloat(row['Quantity'] || row['quantity']);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error(`Row ${rowNumber}: Quantity must be a positive number`);
  }

  const unit = row['Unit'] || row['unit'];
  if (!unit) {
    throw new Error(`Row ${rowNumber}: Unit is required`);
  }

  const activityType = row['Activity Type'] || row['activity_type'] || row['activityType'];
  if (!activityType) {
    throw new Error(`Row ${rowNumber}: Activity Type is required`);
  }

  const scope3Category = row['Scope 3 Category'] || row['scope3_category'] || row['scope3Category'];
  if (scope === 'scope3' && !scope3Category) {
    throw new Error(`Row ${rowNumber}: Scope 3 Category is required for Scope 3 activities`);
  }

  return {
    name,
    description: row['Description'] || row['description'] || null,
    scope,
    scope3Category: scope === 'scope3' ? scope3Category : null,
    activityType,
    quantity,
    unit,
    source: row['Source'] || row['source'] || null,
    tierLevel: (row['Tier Level'] || row['tier_level'] || row['tierLevel'] || 'tier1').toLowerCase(),
    tierDirection: (row['Tier Direction'] || row['tier_direction'] || row['tierDirection'] || 'both').toLowerCase(),
    dataSource: row['Data Source'] || row['data_source'] || row['dataSource'] || 'excel_import',
    dataQualityScore: row['Data Quality Score'] || row['data_quality_score'] || row['dataQualityScore'] || null,
  };
}

/**
 * Get files for a project (alias for getFiles for route compatibility)
 */
export async function getProjectFiles(req: Request, res: Response): Promise<void> {
  const { projectId } = req.params;

  const result = await db.query(
    `SELECT f.*, u.name as uploaded_by_name
     FROM files f
     LEFT JOIN users u ON f.uploaded_by = u.id
     WHERE f.project_id = $1
     ORDER BY f.created_at DESC`,
    [projectId]
  );

  res.json({
    success: true,
    data: result.rows.map((row) => ({
      id: row.id,
      originalName: row.original_name,
      storedName: row.stored_name,
      mimeType: row.mime_type,
      size: row.size,
      uploadedBy: row.uploaded_by_name,
      parseStatus: row.parse_status,
      parseError: row.parse_error,
      createdAt: row.created_at,
    })),
  });
}

/**
 * Get single file info
 */
export async function getFile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const result = await db.query(
    `SELECT f.*, u.name as uploaded_by_name, p.name as project_name
     FROM files f
     LEFT JOIN users u ON f.uploaded_by = u.id
     LEFT JOIN projects p ON f.project_id = p.id
     WHERE f.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const row = result.rows[0];

  res.json({
    success: true,
    data: {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      originalName: row.original_name,
      storedName: row.stored_name,
      mimeType: row.mime_type,
      size: row.size,
      uploadedBy: row.uploaded_by_name,
      parseStatus: row.parse_status,
      parseError: row.parse_error,
      parsedData: row.parsed_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}

/**
 * Download file template
 */
export async function downloadTemplate(req: Request, res: Response): Promise<void> {
  const { format } = req.params;

  const validFormats = ['xlsx', 'csv', 'json'];
  if (!validFormats.includes(format.toLowerCase())) {
    throw new BadRequestError(`Invalid format. Supported formats: ${validFormats.join(', ')}`);
  }

  // Create template based on format
  if (format.toLowerCase() === 'xlsx') {
    // Use existing getActivityTemplate logic
    const templateData = [
      {
        Name: 'Example: Natural Gas Combustion',
        Description: 'On-site natural gas boiler',
        Scope: 'scope1',
        'Scope 3 Category': '',
        'Activity Type': 'stationary_combustion',
        Quantity: 1000,
        Unit: 'm3',
        Source: 'Utility bills',
        'Tier Level': 'tier1',
        'Tier Direction': 'both',
        'Data Source': 'invoice',
        'Data Quality Score': 'high',
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activities Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="activity_template.xlsx"`);
    res.send(buffer);
  } else if (format.toLowerCase() === 'csv') {
    const csvContent = `Name,Description,Scope,Scope 3 Category,Activity Type,Quantity,Unit,Source,Tier Level,Tier Direction,Data Source,Data Quality Score
"Example: Natural Gas Combustion","On-site natural gas boiler",scope1,,stationary_combustion,1000,m3,"Utility bills",tier1,both,invoice,high
"Example: Grid Electricity","Purchased electricity",scope2,,purchased_electricity,50000,kWh,"Electricity provider",tier1,both,invoice,high`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity_template.csv"`);
    res.send(csvContent);
  } else {
    const jsonTemplate = {
      activities: [
        {
          name: 'Example: Natural Gas Combustion',
          description: 'On-site natural gas boiler',
          scope: 'scope1',
          scope3Category: null,
          activityType: 'stationary_combustion',
          quantity: 1000,
          unit: 'm3',
          source: 'Utility bills',
          tierLevel: 'tier1',
          tierDirection: 'both',
          dataSource: 'invoice',
          dataQualityScore: 'high',
        },
      ],
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="activity_template.json"`);
    res.json(jsonTemplate);
  }
}

/**
 * Re-parse file (if parsing failed initially)
 */
export async function reparseFile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.id;

  // Get file info
  const fileResult = await db.query(
    `SELECT * FROM files WHERE id = $1`,
    [id]
  );

  if (fileResult.rows.length === 0) {
    throw new NotFoundError('File not found');
  }

  const file = fileResult.rows[0];
  const filePath = path.join(UPLOAD_DIR, file.project_id, file.stored_name);

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('File not found on disk');
  }

  try {
    // Attempt to parse the file based on type
    const ext = path.extname(file.original_name).toLowerCase();
    let parsedData: any = null;

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      parsedData = XLSX.utils.sheet_to_json(worksheet);
    } else if (ext === '.csv') {
      const workbook = XLSX.readFile(filePath, { type: 'file' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      parsedData = XLSX.utils.sheet_to_json(worksheet);
    } else if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      parsedData = JSON.parse(content);
    }

    // Update file record with parsed data
    await db.query(
      `UPDATE files SET 
         parse_status = 'success',
         parsed_data = $1,
         parse_error = NULL,
         updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(parsedData), id]
    );

    await logAudit(userId, 'REPARSE', 'file', id, { status: 'success' }, file.project_id);

    res.json({
      success: true,
      message: 'File re-parsed successfully',
      data: {
        id: file.id,
        parseStatus: 'success',
        rowCount: Array.isArray(parsedData) ? parsedData.length : 1,
      },
    });
  } catch (error: any) {
    // Update file record with error
    await db.query(
      `UPDATE files SET 
         parse_status = 'error',
         parse_error = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [error.message, id]
    );

    await logAudit(userId, 'REPARSE', 'file', id, { status: 'error', error: error.message }, file.project_id);

    res.status(400).json({
      success: false,
      error: 'Failed to parse file',
      message: error.message,
    });
  }
}
