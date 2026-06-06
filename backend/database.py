import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data/market_lens.db")

class Database:
    instance = None

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
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
