# dash_visualizer.py
import dash
from dash import dcc, html, Input, Output, State
import plotly.graph_objs as go
from transformers import BertTokenizer, BertModel
import torch
import numpy as np

app = dash.Dash(__name__)

device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
model = BertModel.from_pretrained('bert-base-uncased', output_attentions=True).to(device)
model.eval()

app.layout = html.Div([
    html.H1("🧠 Transformer Attention Visualizer", style={'textAlign': 'center'}),
    
    dcc.Textarea(
        id='input-text',
        value='The student failed because he did not study',
        style={'width': '100%', 'height': 100, 'fontSize': 18}
    ),
    
    html.Button('🔍 Analyze', id='analyze-btn', n_clicks=0,
                style={'fontSize': 18, 'padding': '10px 30px', 'margin': '20px'}),
    
    html.Div([
        html.Label('Select Head:'),
        dcc.Slider(id='head-slider', min=0, max=11, value=0, 
                   marks={i: f'Head {i}' for i in range(12)})
    ], style={'margin': '20px'}),
    
    dcc.Graph(id='attention-heatmap'),
    
    html.Div(id='insights', style={'fontSize': 16, 'padding': '20px'})
])

@app.callback(
    [Output('attention-heatmap', 'figure'),
     Output('insights', 'children')],
    [Input('analyze-btn', 'n_clicks'),
     Input('head-slider', 'value')],
    [State('input-text', 'value')]
)
def update_visualization(n_clicks, head, text):
    if n_clicks == 0:
        return go.Figure(), ""
    
    inputs = tokenizer(text, return_tensors='pt')
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    tokens = [t.replace('##', '') for t in tokenizer.convert_ids_to_tokens(inputs['input_ids'][0])]
    attention = outputs.attentions[6][0][head].cpu().numpy()
    
    fig = go.Figure(data=go.Heatmap(
        z=attention,
        x=tokens,
        y=tokens,
        colorscale='RdYlBu_r',
        zmid=0.15
    ))
    
    fig.update_layout(
        title=f'Attention Head {head}',
        xaxis_title='To Token',
        yaxis_title='From Token',
        height=600,
        font=dict(size=14)
    )
    
    insights = html.Div([
        html.H3("🧠 Key Insights:"),
        html.Ul([
            html.Li("Each head learns different patterns"),
            html.Li(f"This head ({head}) shows unique specialization"),
            html.Li("BERT: 144 heads, GPT-3: 9,216 heads!")
        ])
    ])
    
    return fig, insights

if __name__ == '__main__':
    app.run(debug=True, port=8050)