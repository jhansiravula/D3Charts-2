import pandas as pd
import urllib.request

data_sets = [
    {"url": "ftp://sidads.colorado.edu/DATASETS/NOAA/G02135/south/daily/data/S_seaice_extent_daily_v3.0.csv", "file_name": "data_south.csv"},
    {"url": "ftp://sidads.colorado.edu/DATASETS/NOAA/G02135/north/daily/data/N_seaice_extent_daily_v3.0.csv", "file_name": "data_north.csv"}]

for data in data_sets:
    file_name, headers = urllib.request.urlretrieve(data["url"])

    df = pd.read_csv(file_name)
    df = df.drop(0)

    df = df.rename(lambda col: col.strip().lower(), axis="columns")

    for col in ["year", "month", "day", "extent", "missing"]:
        df[col] = pd.to_numeric(df[col])

    df.to_csv(data["file_name"],
        columns=["year", "month", "day", "extent"],
        index=False,
        float_format="%.2f")
