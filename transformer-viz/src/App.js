import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [text, setText] = useState("The student failed because he did not study");
  const [attention, setAttention] = useState(null);
  const [selectedHead, setSelectedHead] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedCombos, setSelectedCombos] = useState([]); // [{layer, head, attention}, ...]
  const [pendingLayer, setPendingLayer] = useState(null); // For compare mode pair selection
  const [pendingHead, setPendingHead] = useState(null); // For compare mode pair selection
  const [batchDoubleClickSource, setBatchDoubleClickSource] = useState(null); // Tracks double-click batch: {type: 'layer'|'head', value: number}

  const sampleSentences = [
    'The student failed the exam because he did not study hard enough',
    'The company closed early today because the storm was getting worse',
    'The professor who teaches machine learning also researches transformers',
    'The deadline was extended because students complained loudly about it'
  ];

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 10000);
    return () => clearInterval(interval);
  }, []);


  const checkBackendHealth = async () => {
    try {
      await axios.get(`${API_URL}/health`, { timeout: 3000 });
      setBackendStatus('connected');
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const handleRandomSentence = () => {
    const randomIndex = Math.floor(Math.random() * sampleSentences.length);
    setText(sampleSentences[randomIndex]);
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

      // Update selected combos with new attention data
      if (selectedCombos.length > 0) {
        const updatedCombos = await Promise.all(
          selectedCombos.map(async (combo) => {
            const res = await axios.post(`${API_URL}/analyze`, {
              text,
              layer: combo.layer
            }, { timeout: 30000 });
            return {
              layer: combo.layer,
              head: combo.head,
              attention: res.data.attention[combo.head]
            };
          })
        );
        setSelectedCombos(updatedCombos);
      }
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
    // Custom gradient: purple -> blue -> teal -> green -> yellow -> orange -> pink -> dark red
    const colors = [
      "#54478c", "#2c699a", "#048ba8", "#0db39e", "#16db93",
      "#83e377", "#b9e769", "#efea5a", "#f1c453", "#f29e4c",
      "#f49cbb", "#dd2d4a"
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

  const getTokenColor = (token, tokens) => {
    // Same color gradient but with fixed low opacity for readability
    const colors = [
      "#54478c", "#2c699a", "#048ba8", "#0db39e", "#16db93",
      "#83e377", "#b9e769", "#efea5a", "#f1c453", "#f29e4c",
      "#f49cbb", "#dd2d4a"
    ];

    // Get unique tokens and find index of this token in the unique list
    const uniqueTokens = [...new Set(tokens)];
    const uniqueIndex = uniqueTokens.indexOf(token);

    // Map to color based on position in unique tokens
    const colorIndex = Math.min(Math.floor((uniqueIndex / uniqueTokens.length) * colors.length), colors.length - 1);
    const hex = colors[colorIndex];
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, 0.25)`; // Fixed 25% opacity
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

  const handleLayerClick = async (layer) => {
    if (compareMode) {
      // Check if this completes a pair
      if (pendingHead !== null) {
        // We have a head waiting, complete the pair
        const existingIndex = selectedCombos.findIndex(
          combo => combo.layer === layer && combo.head === pendingHead
        );

        if (existingIndex >= 0) {
          // Remove if already selected
          setSelectedCombos(selectedCombos.filter((_, i) => i !== existingIndex));
        } else if (selectedCombos.length < 12 && attention) {
          // Add new pair
          try {
            const response = await axios.post(`${API_URL}/analyze`, {
              text,
              layer
            }, { timeout: 30000 });
            setSelectedCombos([...selectedCombos, {
              layer,
              head: pendingHead,
              attention: response.data.attention[pendingHead]
            }]);
          } catch (error) {
            console.error('Error fetching attention for comparison:', error);
          }
        }
        setPendingHead(null);
        setPendingLayer(null);
      } else {
        // Set as pending layer
        setPendingLayer(layer);
      }
    } else {
      // Normal mode: update selection and fetch new attention data
      setSelectedLayer(layer);
      // Fetch attention data for the new layer
      if (attention) {
        setLoading(true);
        axios.post(`${API_URL}/analyze`, {
          text,
          layer
        }, { timeout: 30000 })
          .then(response => {
            setAttention(response.data);
            setBackendStatus('connected');
          })
          .catch(error => {
            console.error('Error fetching attention:', error);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  };

  const handleHeadClick = async (head) => {
    if (compareMode) {
      // Check if this completes a pair
      if (pendingLayer !== null) {
        // We have a layer waiting, complete the pair
        const existingIndex = selectedCombos.findIndex(
          combo => combo.layer === pendingLayer && combo.head === head
        );

        if (existingIndex >= 0) {
          // Remove if already selected
          setSelectedCombos(selectedCombos.filter((_, i) => i !== existingIndex));
        } else if (selectedCombos.length < 12 && attention) {
          // Add new pair
          try {
            const response = await axios.post(`${API_URL}/analyze`, {
              text,
              layer: pendingLayer
            }, { timeout: 30000 });
            setSelectedCombos([...selectedCombos, {
              layer: pendingLayer,
              head,
              attention: response.data.attention[head]
            }]);
          } catch (error) {
            console.error('Error fetching attention for comparison:', error);
          }
        }
        setPendingHead(null);
        setPendingLayer(null);
      } else {
        // Set as pending head
        setPendingHead(head);
      }
    } else {
      // Normal mode: just update selection
      setSelectedHead(head);
    }
  };

  const toggleCompareMode = () => {
    if (compareMode) {
      // Exiting compare mode - clear pending selections but keep current L/H
      setPendingLayer(null);
      setPendingHead(null);
      setBatchDoubleClickSource(null);
      // Keep selectedLayer and selectedHead as is (don't reset to 0,0)
    }
    setCompareMode(!compareMode);
  };

  const handleLayerDoubleClick = async (layer) => {
    if (!compareMode || !attention) return;

    // Check if we should clear the batch (double-clicking any layer in the batch)
    if (selectedCombos.length > 0 && batchDoubleClickSource?.type === 'layer') {
      // Clear the entire batch selection
      setSelectedCombos([]);
      setBatchDoubleClickSource(null);
      setPendingLayer(null);
      setPendingHead(null);
      return;
    }

    // Only allow new batch selection if no existing selections
    if (selectedCombos.length > 0) return;

    // Select ALL heads for this layer
    const headsToSelect = attention.num_heads;
    const newCombos = [];

    try {
      // Fetch attention data for this layer
      const response = await axios.post(`${API_URL}/analyze`, {
        text,
        layer
      }, { timeout: 30000 });

      // Create combos for all heads
      for (let head = 0; head < headsToSelect; head++) {
        newCombos.push({
          layer,
          head,
          attention: response.data.attention[head]
        });
      }

      setSelectedCombos(newCombos);
      setBatchDoubleClickSource({ type: 'layer', value: layer });
      // Clear any pending selections
      setPendingLayer(null);
      setPendingHead(null);
    } catch (error) {
      console.error('Error fetching attention for batch selection:', error);
    }
  };

  const handleHeadDoubleClick = async (head) => {
    if (!compareMode || !attention) return;

    // Check if we should clear the batch (double-clicking any head in the batch)
    if (selectedCombos.length > 0 && batchDoubleClickSource?.type === 'head') {
      // Clear the entire batch selection
      setSelectedCombos([]);
      setBatchDoubleClickSource(null);
      setPendingLayer(null);
      setPendingHead(null);
      return;
    }

    // Only allow new batch selection if no existing selections
    if (selectedCombos.length > 0) return;

    // Select ALL layers for this head
    const layersToSelect = 12;
    const newCombos = [];

    try {
      // Fetch attention data for all 12 layers
      const layerPromises = [];
      for (let layer = 0; layer < layersToSelect; layer++) {
        layerPromises.push(
          axios.post(`${API_URL}/analyze`, {
            text,
            layer
          }, { timeout: 30000 })
        );
      }

      const responses = await Promise.all(layerPromises);

      // Create combos from responses
      for (let i = 0; i < layersToSelect; i++) {
        newCombos.push({
          layer: i,
          head,
          attention: responses[i].data.attention[head]
        });
      }

      setSelectedCombos(newCombos);
      setBatchDoubleClickSource({ type: 'head', value: head });
      // Clear any pending selections
      setPendingLayer(null);
      setPendingHead(null);
    } catch (error) {
      console.error('Error fetching attention for batch selection:', error);
    }
  };

  const removeCombo = (index) => {
    setSelectedCombos(selectedCombos.filter((_, i) => i !== index));
  };

  const isComboSelected = (layer, head) => {
    return selectedCombos.some(combo => combo.layer === layer && combo.head === head);
  };

  const getMultiComboGradient = (combos) => {
    if (combos.length === 0) return null;
    if (combos.length === 1) {
      // Single combo - return solid color
      const index = selectedCombos.findIndex(c => c.layer === combos[0].layer && c.head === combos[0].head);
      const colors = [
        "#54478c", "#2c699a", "#048ba8", "#0db39e", "#16db93",
        "#83e377", "#b9e769", "#efea5a", "#f1c453", "#f29e4c",
        "#f49cbb", "#dd2d4a"
      ];
      const colorIndex = index % colors.length;
      const hex = colors[colorIndex];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.25)`;
    }

    // Multiple combos - create gradient
    const colors = [
      "#54478c", "#2c699a", "#048ba8", "#0db39e", "#16db93",
      "#83e377", "#b9e769", "#efea5a", "#f1c453", "#f29e4c",
      "#f49cbb", "#dd2d4a"
    ];

    const gradientColors = combos.map(combo => {
      const index = selectedCombos.findIndex(c => c.layer === combo.layer && c.head === combo.head);
      const colorIndex = index % colors.length;
      const hex = colors[colorIndex];
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.25)`;
    });

    return `linear-gradient(to right, ${gradientColors.join(', ')})`;
  };

  return (
    <div className="min-h-screen bg-[#040404] text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a]">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-medium tracking-tight">
              Transformer Attention Visualiser
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
          <h3 className="text-sm font-medium text-gray-400 mb-3">Input</h3>
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
              onClick={handleRandomSentence}
              className="px-6 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:bg-[#252525] transition-colors"
              title="Random sentence"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
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

          {/* Tokenized Text Display */}
          {attention && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">
                Tokenized Input - {text.length} characters, {attention.tokens.length} tokens
              </h3>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 flex flex-wrap gap-1 items-center min-h-[48px]">
                {attention.tokens.map((token, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded text-sm"
                    style={{ backgroundColor: getTokenColor(token, attention.tokens) }}
                  >
                    {token.replace('##', '')}
                  </span>
                ))}
              </div>
            </div>
          )}
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
              className="grid grid-cols-[280px_minmax(800px,1fr)_320px] gap-6"
            >
              {/* Left Sidebar - Layer & Head Selector (2 columns) */}
              <div className="space-y-4">
                {/* Compare Mode Toggle */}
                <button
                  onClick={toggleCompareMode}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    compareMode
                      ? 'bg-white text-black'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:bg-[#252525]'
                  }`}
                >
                  {compareMode ? 'Exit Compare Mode' : 'Compare Mode'}
                </button>

                {/* Delete Selection Button */}
                {compareMode && selectedCombos.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCombos([]);
                      setBatchDoubleClickSource(null);
                    }}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-950/30 border border-red-900/50 text-red-400 hover:bg-red-950/50"
                  >
                    Delete Selection
                  </button>
                )}

                {/* Selection Count */}
                {compareMode && selectedCombos.length > 0 && (
                  <div className="text-xs text-gray-400 text-center">
                    {selectedCombos.length} / 12 selected
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Layer Selector */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Layer</h3>
                    <div className="space-y-2">
                      {[...Array(12)].map((_, i) => {
                        // Check if ANY combo uses this layer
                        const combosWithThisLayer = selectedCombos.filter(c => c.layer === i);
                        const hasCombo = combosWithThisLayer.length > 0;
                        const comboGradient = hasCombo ? getMultiComboGradient(combosWithThisLayer) : null;
                        const isPending = compareMode && pendingLayer === i;
                        const isCurrentlySelected = selectedLayer === i && !compareMode;

                        // Build style object
                        const buttonStyle = {};
                        if (comboGradient && !isCurrentlySelected && !isPending) {
                          // Apply gradient only when NOT currently selected for navigation
                          if (combosWithThisLayer.length === 1) {
                            buttonStyle.backgroundColor = comboGradient;
                          } else {
                            buttonStyle.backgroundImage = comboGradient;
                          }
                          buttonStyle.color = '#fff';
                        }

                        return (
                          <div key={i} className="flex gap-1">
                            <button
                              onClick={() => handleLayerClick(i)}
                              onDoubleClick={() => handleLayerDoubleClick(i)}
                              className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isCurrentlySelected
                                  ? 'bg-[#252525] text-white'
                                  : isPending
                                  ? 'bg-[#2a2a2a] text-white border border-[#3a3a3a]'
                                  : !comboGradient
                                  ? 'text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300'
                                  : ''
                              }`}
                              style={buttonStyle}
                            >
                              Layer {i}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Head Selector */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Head</h3>
                    <div className="space-y-2">
                      {[...Array(attention.num_heads)].map((_, i) => {
                        // Check if ANY combo uses this head
                        const combosWithThisHead = selectedCombos.filter(c => c.head === i);
                        const hasCombo = combosWithThisHead.length > 0;
                        const comboGradient = hasCombo ? getMultiComboGradient(combosWithThisHead) : null;
                        const isPending = compareMode && pendingHead === i;
                        const isCurrentlySelected = selectedHead === i && !compareMode;

                        // Build style object
                        const buttonStyle = {};
                        if (comboGradient && !isCurrentlySelected && !isPending) {
                          // Apply gradient only when NOT currently selected for navigation
                          if (combosWithThisHead.length === 1) {
                            buttonStyle.backgroundColor = comboGradient;
                          } else {
                            buttonStyle.backgroundImage = comboGradient;
                          }
                          buttonStyle.color = '#fff';
                        }

                        return (
                          <div key={i} className="flex gap-1">
                            <button
                              onClick={() => handleHeadClick(i)}
                              onDoubleClick={() => handleHeadDoubleClick(i)}
                              className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                isCurrentlySelected
                                  ? 'bg-white text-black'
                                  : isPending
                                  ? 'bg-[#2a2a2a] text-white border border-[#3a3a3a]'
                                  : !comboGradient
                                  ? 'text-gray-500 hover:bg-[#1a1a1a] hover:text-gray-300'
                                  : ''
                              }`}
                              style={buttonStyle}
                            >
                              Head {i}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Selected Combos List */}
                {selectedCombos.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-400 mb-3">Selected Combinations</h3>
                    <div className="space-y-2">
                      {selectedCombos.map((combo, i) => (
                        <div key={i} className="flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
                          <span className="text-sm">L{combo.layer} H{combo.head}</span>
                          <button
                            onClick={() => removeCombo(i)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      <span>Some heads focus on <span className="text-gray-200">syntax</span> (subject to verb relationships)</span>
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

        {/* Comparison Grid */}
        <AnimatePresence>
          {selectedCombos.length > 0 && attention && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <h3 className="text-base font-medium mb-4">Comparison View</h3>
              <div className="grid grid-cols-4 gap-4">
                {selectedCombos.map((combo, idx) => (
                  <div key={idx} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                    <h4 className="text-xs font-medium text-gray-400 mb-3 text-center">
                      Layer {combo.layer} Head {combo.head}
                    </h4>
                    <div className="flex flex-col gap-1 items-center justify-center">
                      {combo.attention.map((row, i) => (
                        <div key={i} className="flex gap-1">
                          {row.map((attnValue, j) => (
                            <div
                              key={j}
                              className="rounded"
                              style={{
                                width: `${Math.max(8, 200 / attention.tokens.length)}px`,
                                height: `${Math.max(8, 200 / attention.tokens.length)}px`,
                                backgroundColor: getAttentionColor(attnValue),
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;