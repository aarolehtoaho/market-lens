import sqlite3

class Database:
    instance = None

    def __new__(cls):
        if cls.instance is None:
            cls.instance = super(Database, cls).__new__(cls)
            #OperationalError: unable to open database file
            cls.instance.conn = sqlite3.connect("market_lens.db", check_same_thread=False)
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