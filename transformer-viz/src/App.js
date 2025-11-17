import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [text, setText] = useState("The student failed because he did not study");
  const [attention, setAttention] = useState(null);
  const [selectedHead, setSelectedHead] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState(6);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (attention && text) {
      analyzeText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLayer]);

  const checkBackendHealth = async () => {
    try {
      await axios.get(`${API_URL}/health`, { timeout: 3000 });
      setBackendStatus('connected');
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const analyzeText = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        text,
        layer: selectedLayer
      }, { timeout: 30000 });
      setAttention(response.data);
      setBackendStatus('connected');
    } catch (error) {
      console.error('Error:', error);
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend server. Make sure it\'s running on port 8000.');
      } else if (error.code === 'ECONNABORTED') {
        setError('Request timeout. The model might be loading for the first time.');
      } else {
        setError(error.response?.data?.detail || 'An error occurred while analyzing the text.');
      }
      setBackendStatus('disconnected');
    }
    setLoading(false);
  };

  const getAttentionColor = (value) => {
    // Custom gradient: purple -> blue -> teal -> green -> yellow -> orange
    const colors = [
      "#54478c", "#2c699a", "#048ba8", "#0db39e", "#16db93",
      "#83e377", "#b9e769", "#efea5a", "#f1c453", "#f29e4c"
    ];

    // Map value (0-1) to color index
    const index = Math.min(Math.floor(value * colors.length), colors.length - 1);
    const opacity = Math.min(0.3 + value * 0.7, 1); // Scale opacity from 0.3 to 1

    // Convert hex to rgba
    const hex = colors[index];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const navigatePrevious = () => {
    if (!attention) return;

    if (selectedHead > 0) {
      setSelectedHead(selectedHead - 1);
    } else if (selectedLayer > 0) {
      setSelectedLayer(selectedLayer - 1);
      setSelectedHead(attention.num_heads - 1);
    }
  };

  const navigateNext = () => {
    if (!attention) return;

    if (selectedHead < attention.num_heads - 1) {
      setSelectedHead(selectedHead + 1);
    } else if (selectedLayer < 11) {
      setSelectedLayer(selectedLayer + 1);
      setSelectedHead(0);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a]">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium tracking-tight">
              Transformer Attention Visualizer
            </h1>

            {/* Backend Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-green-500' :
                backendStatus === 'disconnected' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
              <span className="text-sm text-gray-400">
                {backendStatus === 'connected' ? 'Connected' :
                 backendStatus === 'disconnected' ? 'Offline' :
                 'Checking'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-8 py-8">
        {/* Input Section */}
        <div className="mb-8">
          <div className="flex gap-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyzeText()}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-base focus:outline-none focus:border-[#3a3a3a] transition-colors"
              placeholder="Enter any sentence to analyze..."
            />
            <button
              onClick={analyzeText}
              disabled={loading}
              className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:bg-[#252525] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 bg-red-950/30 border border-red-900/50 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-400 mb-1">Connection Error</h3>
                  <p className="text-sm text-gray-400">{error}</p>
                  {backendStatus === 'disconnected' && (
                    <div className="mt-3 p-3 bg-[#1a1a1a] rounded border border-[#2a2a2a]">
                      <p className="text-xs text-gray-500 mb-2">To start the backend server:</p>
                      <code className="text-xs text-gray-300">python backend.py</code>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results - 3 Column Layout */}
        <AnimatePresence>
          {attention && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-[280px_1fr_320px] gap-6"
            >
              {/* Left Sidebar - Layer & Head Selector (2 columns) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Layer Selector */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Layer</h3>
                  <div className="space-y-2">
                    {[...Array(12)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedLayer(i)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedLayer === i
                            ? 'bg-[#252525] text-white'
                            : 'text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300'
                        }`}
                      >
                        Layer {i}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Head Selector */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Head</h3>
                  <div className="space-y-2">
                    {[...Array(attention.num_heads)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedHead(i)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedHead === i
                            ? 'bg-white text-black'
                            : 'text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300'
                        }`}
                      >
                        Head {i}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Center - Attention Matrix */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={navigatePrevious}
                    disabled={selectedLayer === 0 && selectedHead === 0}
                    className="p-2 rounded-lg hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <h3 className="text-base font-medium">
                    Attention Pattern - Layer {selectedLayer} Head {selectedHead}
                  </h3>

                  <button
                    onClick={navigateNext}
                    disabled={selectedLayer === 11 && selectedHead === attention.num_heads - 1}
                    className="p-2 rounded-lg hover:bg-[#252525] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="overflow-auto flex justify-center">
                  <div style={{ paddingTop: '60px', minWidth: 'fit-content' }}>
                    {/* Column Headers */}
                    <div className="flex" style={{ marginLeft: '84px', marginBottom: '4px', height: '60px', marginTop: '-60px' }}>
                      {attention.tokens.map((token, i) => (
                        <div
                          key={i}
                          className="flex items-end justify-start"
                          style={{
                            width: '60px',
                            height: '60px',
                            marginRight: '4px'
                          }}
                        >
                          <div
                            className="text-xs text-gray-400 whitespace-nowrap"
                            style={{
                              transform: 'rotate(-45deg)',
                              transformOrigin: 'bottom left',
                              paddingLeft: '4px'
                            }}
                          >
                            {token.replace('##', '')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Matrix Rows */}
                    {attention.tokens.map((fromToken, i) => (
                      <div key={i} className="flex items-center" style={{ marginBottom: '4px' }}>
                        {/* Row Header */}
                        <div className="text-xs text-gray-500 text-right" style={{ width: '80px', paddingRight: '8px' }}>
                          {fromToken.replace('##', '')}
                        </div>

                        {/* Attention Cells */}
                        {attention.attention[selectedHead][i].map((attnValue, j) => (
                          <div
                            key={j}
                            onMouseEnter={() => setHoveredCell({ from: i, to: j, value: attnValue })}
                            onMouseLeave={() => setHoveredCell(null)}
                            className="rounded cursor-pointer flex items-center justify-center text-xs font-medium transition-transform hover:scale-110"
                            style={{
                              width: '60px',
                              height: '60px',
                              marginRight: '4px',
                              backgroundColor: getAttentionColor(attnValue),
                              border: hoveredCell?.from === i && hoveredCell?.to === j
                                ? '2px solid white'
                                : '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            {attnValue > 0.15 && (
                              <span className="text-white text-shadow">
                                {attnValue.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Split vertically */}
              <div className="space-y-6">
                {/* Key Insights - Top Half */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                  <h3 className="text-base font-medium mb-4">Key Insights</h3>
                  <ul className="space-y-3 text-xs text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-600 mt-0.5 flex-shrink-0">•</span>
                      <span>Each head learns <span className="text-gray-200">different patterns</span> automatically during training</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-600 mt-0.5 flex-shrink-0">•</span>
                      <span>Some heads focus on <span className="text-gray-200">syntax</span> (subject → verb relationships)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-600 mt-0.5 flex-shrink-0">•</span>
                      <span>Others track <span className="text-gray-200">long-range dependencies</span> and semantic meaning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-600 mt-0.5 flex-shrink-0">•</span>
                      <span>BERT has <span className="text-gray-200">12 layers × 12 heads = 144</span> specialized attention patterns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-600 mt-0.5 flex-shrink-0">•</span>
                      <span>GPT-3 scales this to <span className="text-gray-200">96 layers × 96 heads = 9,216</span> patterns</span>
                    </li>
                  </ul>
                </div>

                {/* Attention Head Info - Bottom Half */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
                  <h3 className="text-base font-medium mb-4">Current Selection</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                      <span className="text-gray-400">Layer</span>
                      <span className="text-white font-medium">{selectedLayer}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                      <span className="text-gray-400">Head</span>
                      <span className="text-white font-medium">{selectedHead}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-[#2a2a2a]">
                      <span className="text-gray-400">Total Heads</span>
                      <span className="text-white font-medium">{attention.num_heads}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400">Tokens</span>
                      <span className="text-white font-medium">{attention.tokens.length}</span>
                    </div>
                  </div>

                  {hoveredCell && (
                    <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
                      <h4 className="text-xs font-medium text-gray-400 mb-2">Hover Details</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">From</span>
                          <span className="text-gray-300">"{attention.tokens[hoveredCell.from].replace('##', '')}"</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">To</span>
                          <span className="text-gray-300">"{attention.tokens[hoveredCell.to].replace('##', '')}"</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Attention</span>
                          <span className="text-white font-semibold">{(hoveredCell.value * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;