import pandas as pd
from pathlib import Path

data = Path(__file__).parent.absolute() / 'data'

# load the CSV data into pandas dataframes
associations_df = pd.read_csv(data / 'associations_etudiantes.csv')
evenements_df = pd.read_csv(data / 'evenements_associations.csv')

print(associations_df.head())
mask = associations_df['id'] == 1
print(associations_df[mask])