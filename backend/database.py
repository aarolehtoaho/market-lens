import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data/market_lens.db")

class Database:
    instance = None
    conn: sqlite3.Connection

    def __new__(cls):
        if cls.instance is None:
            cls.instance = super(Database, cls).__new__(cls)
            cls.instance.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            cls.instance.init_db(cls.instance.conn)
        return cls.instance
    
    def get_connection(self):
        return self.conn
    
    def init_db(self, conn):
        cursor = conn.cursor()
        # Create a table for cahcing ticker search results, for avoiding repeated API calls to yfinance
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ticker_cache (
                query TEXT PRIMARY KEY,
                results TEXT
            )
        """)
        self.conn.commit()

        # Create a table "tickers" for user watchlist entries
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tickers (
                position INTEGER PRIMARY KEY,
                symbol TEXT NOT NULL UNIQUE,
                name TEXT,
                exchange TEXT,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                period TEXT DEFAULT '1d',
                interval TEXT DEFAULT '5m'
            )
        """)
        self.conn.commit()
        
        # Create a table for user interests
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS interests (
                position INTEGER PRIMARY KEY,
                interest TEXT NOT NULL UNIQUE,
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

        # Create a table for caching ohlcv data for tickers
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ohlcv_cache (
                symbol TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

        # Create a table for caching indicator data for tickers
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS indicator_cache (
                symbol TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

        # Create a table for LLM configuration
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS llm_configuration (
                provider TEXT PRIMARY KEY,
                api_key TEXT NOT NULL,
                model TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()

    def cache_ticker_search(self, query: str, results: list[dict]):
        cursor = self.conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO ticker_cache (query, results) VALUES (?, ?)", (query, str(results)))
        self.conn.commit()

    def search_cached_tickers(self, query: str) -> list[dict] | None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT results FROM ticker_cache WHERE query = ?", (query,))
        row = cursor.fetchone()
        if row:
            return eval(row[0])
        return None
    
    def add_ticker(self, ticker: dict, position: int):
        cursor = self.conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO tickers (position, symbol, name, exchange) VALUES (?, ?, ?, ?)", 
                       (position, ticker["symbol"], ticker["name"], ticker["exchange"]))
        self.conn.commit()

    def remove_ticker(self, symbol: str):
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM tickers WHERE symbol = ?", (symbol,))
        self.conn.commit()

    def remove_ticker_by_position(self, position: int):
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM tickers WHERE position = ?", (position,))
        self.conn.commit()

    def list_tickers(self) -> list[dict]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT symbol, name, exchange FROM tickers ORDER BY position")
        rows = cursor.fetchall()
        return [{"symbol": row[0], "name": row[1], "exchange": row[2]} for row in rows]

    def list_interests(self) -> list[dict]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT interest FROM interests ORDER BY position")
        rows = cursor.fetchall()
        return [{"interest": row[0]} for row in rows]
    
    def add_interest(self, interest: dict, position: int):
        cursor = self.conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO interests (position, interest) VALUES (?, ?)", 
                       (position, interest["interest"]))
        self.conn.commit()

    def remove_interest(self, position: int):
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM interests WHERE position = ?", (position,))
        self.conn.commit()

    def setChartOptions(self, symbol: str, period: str, interval: str):
        cursor = self.conn.cursor()
        cursor.execute("UPDATE tickers SET period = ?, interval = ? WHERE symbol = ?", (period, interval, symbol))
        self.conn.commit()

    def getChartOptions(self, symbol: str) -> dict:
        cursor = self.conn.cursor()
        cursor.execute("SELECT period, interval FROM tickers WHERE symbol = ?", (symbol,))
        row = cursor.fetchone()
        if row:
            return {"period": row[0], "interval": row[1]}
        return {"period": "1d", "interval": "5m"}

    def cache_ohlcv_data(self, data: list[dict]):
        cursor = self.conn.cursor()
        for entry in data:
            cursor.execute("INSERT OR REPLACE INTO ohlcv_cache (symbol, data, updated_at) VALUES (?, ?, ?)", 
                           (entry["symbol"], str(entry["data"]), entry["updated_at"]))
        self.conn.commit()

    def cache_indicator_data(self, data: list[dict]):
        cursor = self.conn.cursor()
        for entry in data:
            cursor.execute("INSERT OR REPLACE INTO indicator_cache (symbol, data, updated_at) VALUES (?, ?, ?)", 
                           (entry["symbol"], str(entry["data"]), entry["updated_at"]))
        self.conn.commit()

    def get_cached_ohlcv_data(self, symbol: str) -> dict | None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT data, updated_at FROM ohlcv_cache WHERE symbol = ?", (symbol,))
        row = cursor.fetchone()
        if row:
            return {"data": eval(row[0]), "updated_at": row[1]}
        return None
    
    def get_cached_indicator_data(self, symbol: str) -> dict | None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT data, updated_at FROM indicator_cache WHERE symbol = ?", (symbol,))
        row = cursor.fetchone()
        if row:
            return {"data": eval(row[0]), "updated_at": row[1]}
        return None

    def save_llm_configuration(self, provider: str, api_key: str, model: str):
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO llm_configuration (provider, api_key, model) 
            VALUES (?, ?, ?)
            ON CONFLICT(provider) DO UPDATE SET 
                api_key=excluded.api_key, 
                model=excluded.model, 
                updated_at=CURRENT_TIMESTAMP
        """, (provider, api_key, model))
        self.conn.commit()

    def get_llm_configurations(self) -> list[dict] | None:
        cursor = self.conn.cursor()
        cursor.execute("SELECT provider, api_key, model, updated_at FROM llm_configuration ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        if rows:
            return [{"provider": row[0], "api_key": row[1], "model": row[2], "updated_at": row[3]} for row in rows]
        return None
