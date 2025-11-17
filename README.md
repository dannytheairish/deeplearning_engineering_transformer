# Transformer Attention Visualizer

An interactive web application for exploring and understanding attention patterns in BERT transformer models. Built as part of a deep learning engineering project, this tool provides real-time visualisation of how transformer heads attend to different tokens in a sequence.

## Overview

Transformers have revolutionised natural language processing, but their internal workings can be difficult to interpret. This visualiser makes it straightforward to examine attention patterns across all 12 layers and 12 heads of BERT, helping researchers, students, and practitioners understand how these models process language.

**Key Features:**
- Real-time attention heatmap visualisation
- Interactive comparison mode for analysing multiple layer-head combinations
- Token-level attention flow with colour-coded patterns
- Support for custom text input
- Clean, minimalist interface built with modern web technologies

## Model Architecture

This visualiser uses **BERT base (uncased)** from Hugging Face's transformers library:
- Model: `bert-base-uncased`
- Architecture: 12 transformer layers
- Attention heads per layer: 12
- Total attention patterns: 144 (12 × 12)
- Vocabulary size: 30,522 WordPiece tokens

## Getting Started

### Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- pip and npm package managers

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/transformer-attention-viz.git
   cd transformer-attention-viz
   ```

2. **Set up the Python backend**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Install the React frontend**
   ```bash
   cd transformer-viz
   npm install
   cd ..
   ```

### Running the Application

The easiest way to start both servers is using the provided startup script:

```bash
chmod +x start.sh  # Make the script executable (first time only)
./start.sh
```

Alternatively, you can start the servers manually:

**Terminal 1 - Backend:**
```bash
source venv/bin/activate
python backend.py
```

**Terminal 2 - Frontend:**
```bash
cd transformer-viz
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Usage Guide

### Basic Navigation

1. **Enter your text** in the input field at the top of the page
2. **Click the send button** to analyse the text with BERT
3. **Navigate through layers and heads** using the sidebar buttons or arrow keys
4. **Hover over cells** in the attention matrix to see detailed attention scores

### Compare Mode

Compare mode lets you examine multiple attention patterns simultaneously:

1. **Click "Compare Mode"** to activate comparison view
2. **Select layer-head pairs** by clicking a layer, then a head
3. **Quick selection shortcuts:**
   - Double-click a layer to select all 12 heads for that layer
   - Double-click a head to select all 12 layers for that head
   - Double-click again to clear the batch selection
4. **Manage selections** with the "Delete Selection" button
5. Maximum of 12 combinations can be compared at once

### Understanding the Visualisation

- **Colour gradient:** Purple → blue → teal → green → yellow → orange → pink → red
- **Darker/more saturated colours** indicate stronger attention
- **Row tokens** show which token is "attending from"
- **Column tokens** show which tokens receive attention
- **Numerical values** appear in cells with attention > 0.15

## Technical Stack

**Frontend:**
- React 19.2.0
- Tailwind CSS for styling
- Framer Motion for animations
- Axios for API communication

**Backend:**
- FastAPI for REST API
- PyTorch for model inference
- Hugging Face Transformers library
- BERT base uncased model

## Project Structure

```
.
├── backend.py              # FastAPI server with BERT inference
├── transformer-viz/        # React frontend application
│   ├── src/
│   │   └── App.js         # Main React component
│   ├── public/
│   └── package.json
├── start.sh               # Convenience startup script
├── requirements.txt       # Python dependencies
└── README.md
```

## Performance Notes

- **First run:** The BERT model (~420MB) will be downloaded automatically
- **Inference time:** Typically 100-300ms per analysis on modern hardware
- **Batch selection:** May take 2-4 seconds when selecting all 12 combinations

## Acknowledgements

This project was developed as part of a Deep Learning Engineering course. It builds upon:
- The [Hugging Face Transformers](https://huggingface.co/transformers/) library
- BERT architecture from [Devlin et al. (2018)](https://arxiv.org/abs/1810.04805)
- Inspiration from the [BertViz](https://github.com/jessevig/bertviz) project

## Licence

This project is available for educational and research purposes.
