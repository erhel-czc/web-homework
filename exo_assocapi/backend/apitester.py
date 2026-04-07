from pathlib import Path

import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# -----------------
# CORS setup (it's black magic - keep as-is)
# -----------------
origins = [
    "*"  # allow all origins for simplicity (not recommended for production)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],  # allow all HTTP methods
    allow_headers=["*"],  # allow all headers
)

# -----------------
# CSV data
# -----------------
# spot the data folder
data = Path(__file__).parent.absolute() / 'data'

# load the CSV data into pandas dataframes
associations_df = pd.read_csv(data / 'associations_etudiantes.csv')
evenements_df = pd.read_csv(data / 'evenements_associations.csv')

# -----------------
## your code (route handlers) goes here
# -----------------

@app.get('/api/alive')
def alive():
    return {"message": "Alive"}

@app.get('/api/associations')
def get_associations():
    associations_id = associations_df.id.tolist()
    return associations_id

@app.get('/api/association/{id}')
def get_association(id: int):
    mask = associations_df['id'] == id
    association = associations_df[mask]

    if association.empty:
        raise HTTPException(status_code=404, detail={"error": "Association not found"})
    
    return association.to_dict(orient="records")[0]

@app.get('/api/evenements')
def get_evenements():
    evenements_id = evenements_df.id.tolist()
    return evenements_id

@app.get('/api/evenement/{id}')
def get_evenement(id: int):
    mask = evenements_df['id'] == id
    evenement = evenements_df[mask]

    if evenement.empty:
        raise HTTPException(status_code=404, detail={"error": "Event not found"})
    
    return evenement.to_dict(orient="records")[0]

@app.get('/api/association/{id}/evenements')
def get_association_evenements(id: int):
    mask = evenements_df['association_id'] == id
    evenements = evenements_df[mask]

    if evenements.empty:
        raise HTTPException(status_code=404, detail={"error": "No events found for this association"})
    
    return evenements.to_dict(orient="records")[0]

@app.get('/api/associations/type/{type}')
def test():
    pass