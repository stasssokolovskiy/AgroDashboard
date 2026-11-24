import os
from urllib.parse import quote_plus
import pandas as pd
from sqlalchemy import create_engine
import signal

def get_db_url():
    user = quote_plus(os.environ["BACKEND_DB_USER"])
    password = quote_plus(os.environ["BACKEND_DB_PASSWORD"])
    endpoint = os.environ["POSTGRES_ENDPOINT"]

    return f"postgresql+psycopg2://{user}:{password}@{endpoint}"


def main():
    engine = create_engine(get_db_url())

    df = pd.read_csv("hyg_v44.csv.gz", low_memory=False)

    df.to_sql(
        name = 'stars',
        con = engine,
        schema = 'public',
        if_exists='replace',
        index=False
    )

if __name__ == "__main__":
    main()
    with open("/tmp/ok", "w") as f:
        pass
    signal.pause()

