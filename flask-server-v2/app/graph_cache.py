from app.graph import Graph
class GraphCacheManager:
    def __init__(self):
        self.cache: Dict[str, Optional[Graph]] = {}
        self.dirty_flags: Dict[str, bool] = {}

    async def get_graph(self, username: str) -> Graph:
        if username not in self.cache or self.dirty_flags.get(username, False):
            return None
        return self.cache[username]

    async def set_graph(self, user_id: str, graph: Graph):
        self.cache[user_id] = graph
        self.dirty_flags[user_id] = False

    async def mark_dirty(self, user_id: str):
        self.dirty_flags[user_id] = True

    async def invalidate(self, user_id: str):
        self.cache.pop(user_id, None)
        self.dirty_flags.pop(user_id, None)