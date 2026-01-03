import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Leaf,
  TrendingUp,
  FileText,
  Calculator,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  { icon: Calculator, text: 'How do I calculate Scope 3 emissions for business travel?' },
  { icon: FileText, text: 'What are the reporting requirements for EU CBAM?' },
  { icon: TrendingUp, text: 'How can I reduce my Scope 2 emissions?' },
  { icon: Leaf, text: 'What emission factors should I use for electricity in Thailand?' },
];

const demoResponses: Record<string, string> = {
  'scope 3': `**Calculating Scope 3 emissions for business travel:**

1. **Collect data** on all business trips (distance, mode of transport)
2. **Apply emission factors** based on transport type:
   - Air travel: ~0.255 kgCO2e/passenger-km (short-haul)
   - Rail: ~0.041 kgCO2e/passenger-km
   - Car: ~0.171 kgCO2e/km

3. **Formula**: Total Emissions = Distance × Emission Factor

For flights, consider using calculators that account for:
- Flight distance (short/medium/long haul)
- Class of travel (economy vs business)
- Radiative forcing index (RFI)

Would you like me to help calculate emissions for specific trips?`,
  
  'eu cbam': `**EU CBAM Reporting Requirements:**

The EU Carbon Border Adjustment Mechanism requires:

1. **Quarterly Reports** during transitional period (2023-2025)
2. **Data Required**:
   - Quantity of imported goods
   - Actual embedded emissions (direct + indirect)
   - Carbon price paid in origin country

3. **Covered Products**:
   - Iron & Steel
   - Cement
   - Fertilizers
   - Aluminum
   - Hydrogen
   - Electricity

4. **Key Deadlines**:
   - Reports due within 1 month after each quarter
   - Full implementation from 2026

Need help generating an EU CBAM report for your project?`,
  
  'reduce scope 2': `**Strategies to Reduce Scope 2 Emissions:**

1. **Energy Efficiency**
   - LED lighting upgrades
   - HVAC optimization
   - Energy management systems

2. **Renewable Energy**
   - On-site solar/wind installation
   - Purchase Renewable Energy Certificates (RECs)
   - Power Purchase Agreements (PPAs)

3. **Location-Based vs Market-Based**
   - Use market-based method to show RE purchases
   - Green tariffs from utilities

4. **Quick Wins**:
   - Switch to green energy supplier
   - Install smart meters
   - Occupancy sensors

Your current Scope 2 emissions are primarily from purchased electricity. 
Switching to 50% renewable energy could reduce these by ~45%.`,

  'thailand electricity': `**Emission Factors for Thailand Electricity:**

**Grid Emission Factor (2025)**
- **Location-based**: 0.4561 kgCO2e/kWh
- Source: EGAT (Electricity Generating Authority of Thailand)

**Historical Trend**:
| Year | Factor (kgCO2e/kWh) |
|------|---------------------|
| 2025 | 0.4561 |
| 2024 | 0.4672 |
| 2023 | 0.4893 |

**Notes**:
- Thailand grid is improving as renewable capacity increases
- For market-based accounting, use supplier-specific factors
- Some industrial zones have different factors

This factor is already configured in your emission factors database.`,
};

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hello! I'm your ESG AI Assistant. I can help you with:

• **Emission Calculations** - Calculate GHG emissions for various activities
• **Reporting Standards** - Guidance on EU CBAM, K-ESG, Thai-ESG, and more
• **Best Practices** - Recommendations for reducing your carbon footprint
• **Data Analysis** - Insights from your emission data

How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const lowerInput = inputValue.toLowerCase();
      let response = "I'd be happy to help with that! Could you provide more details about your specific ESG reporting needs? I can assist with emission calculations, reporting standards, or provide guidance on reducing your carbon footprint.";
      
      if (lowerInput.includes('scope 3') || lowerInput.includes('business travel')) {
        response = demoResponses['scope 3'];
      } else if (lowerInput.includes('cbam') || lowerInput.includes('eu ')) {
        response = demoResponses['eu cbam'];
      } else if (lowerInput.includes('reduce') || lowerInput.includes('scope 2')) {
        response = demoResponses['reduce scope 2'];
      } else if (lowerInput.includes('thailand') || lowerInput.includes('electricity')) {
        response = demoResponses['thailand electricity'];
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="h-[calc(100vh-12rem)] flex flex-col">
      <motion.div variants={item} className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-earth-800 dark:text-earth-100">
              AI Assistant
            </h1>
            <Badge variant="grass">
              <Sparkles className="w-3 h-3 mr-1" />
              Beta
            </Badge>
          </div>
          <p className="text-earth-500 dark:text-earth-400 mt-1">
            Get help with ESG reporting, calculations, and best practices
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setMessages([messages[0]])}>
          <RefreshCw className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </motion.div>

      <motion.div variants={item} className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <Card variant="default" className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === 'user'
                      ? 'bg-grass-500 text-white'
                      : 'bg-grass-50 dark:bg-earth-800 text-earth-800 dark:text-earth-100'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-grass-200 dark:bg-earth-700 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-grass-600 dark:text-grass-400" />
                      </div>
                      <span className="text-sm font-medium">ESG Assistant</span>
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  {message.role === 'assistant' && (
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={() => copyToClipboard(message.content, message.id)}
                        className="text-earth-400 hover:text-earth-600 dark:hover:text-earth-300 transition-colors"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-grass-50 dark:bg-earth-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-grass-200 dark:bg-earth-700 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-grass-600 dark:text-grass-400" />
                    </div>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-grass-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-grass-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-grass-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-grass-100 dark:border-earth-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about emissions, reporting, or ESG best practices..."
                className="flex-1 px-4 py-3 rounded-xl border border-grass-200 dark:border-earth-700 bg-white dark:bg-earth-800 text-earth-800 dark:text-earth-100 placeholder-earth-400 focus:outline-none focus:ring-2 focus:ring-grass-500"
              />
              <Button variant="primary" onClick={handleSend} disabled={!inputValue.trim()}>
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="w-80 space-y-4 hidden lg:block">
          {/* Suggested Questions */}
          <Card variant="grass">
            <CardHeader
              title="Suggested Questions"
              subtitle="Click to ask"
            />
            <div className="space-y-2 mt-4">
              {suggestedQuestions.map((q, idx) => {
                const Icon = q.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(q.text)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-earth-800 hover:bg-grass-50 dark:hover:bg-earth-700 text-left transition-colors"
                  >
                    <Icon className="w-5 h-5 text-grass-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-earth-700 dark:text-earth-300">{q.text}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Capabilities */}
          <Card variant="default">
            <CardHeader
              title="Capabilities"
              subtitle="What I can help with"
            />
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-grass-100 dark:bg-earth-700 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-grass-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Emission Calculations</p>
                  <p className="text-xs text-earth-500">Scope 1, 2 & 3</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Reporting Standards</p>
                  <p className="text-xs text-earth-500">CBAM, K-ESG, Thai-ESG</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Best Practices</p>
                  <p className="text-xs text-earth-500">Reduction strategies</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-earth-800 dark:text-earth-100">Guidance</p>
                  <p className="text-xs text-earth-500">Step-by-step help</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AIAssistant;
