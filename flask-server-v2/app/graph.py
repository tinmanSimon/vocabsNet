from typing import Set, List, Optional
from core.vocab_types import Word, Edge, UserInfo
from typing import Dict, Tuple, List
from collections import deque
from datetime import datetime, timedelta


TAGS_TIME_WINDOW = timedelta(hours=2)

class Graph:
    def __init__(self):
        self.words: Dict[str, Word] = {}
        self.edges: Dict[Tuple[str, str, str], Edge] = {}
        self.tagsMeta: Dict[str, int] = {} # tagName : count
        self.last_hard_update_tags = None
        

    def add_words(self, words: list[Word]):
        for word in words:
            self.words[word.name] = word

    def get_all_data(self):
        if not self.last_hard_update_tags or (now - self.last_hard_update_tags) > TIME_WINDOW:
            self.update_tags_meta()

        return {
            "words" : list(self.words.values()),
            "edges" : list(self.edges.values()),
            "tags_meta": self.get_tags_meta()
        }

    def get_data(
        self,
        user: UserInfo,
        fetchSize: int,
        start_word_name: str = ""
    ) -> Dict[str, List]:
        """
        Return up to `fetchSize` Word objects.  When one connected component
        is exhausted the search automatically jumps to another until the
        quota is met or all words are visited.
        """

        # ────────────────────────────────────────────────────────────────
        # Fast path
        # ────────────────────────────────────────────────────────────────
        if fetchSize >= len(self.words):
            return self.get_all_data()

        # ────────────────────────────────────────────────────────────────
        # Choose the initial starting word
        # ────────────────────────────────────────────────────────────────
        if start_word_name:
            if start_word_name not in self.words:
                return {"words": [], "edges": []}
            start_point = self.words[start_word_name]
        elif self.word_exist(user.last_focused_word):
            start_point = self.words[user.last_focused_word]
        else:
            start_point = next(reversed(self.words.values()))

        # ────────────────────────────────────────────────────────────────
        # BFS across *all* components
        # ────────────────────────────────────────────────────────────────
        queue: deque[Word] = deque([start_point])
        seen: set[str] = set()
        result_words: list[Word] = []
        collected_edges: list[Edge] = []

        # A list (or tuple) of the Word objects in insertion order lets us
        # pick “next unvisited” in O(N) when we finish a component.
        ordered_words = tuple(reversed(self.words.values()))
        next_index = 0

        while len(result_words) < fetchSize and len(seen) < len(self.words):

            # ─── If current component is finished, jump to another ───
            if not queue:
                while next_index < len(ordered_words) and ordered_words[next_index].name in seen:
                    next_index += 1
                if next_index == len(ordered_words):
                    break                           # every word visited
                queue.append(ordered_words[next_index])
                next_index += 1

            current = queue.popleft()

            # Already handled?
            if current.name in seen:
                continue

            # Record the word
            seen.add(current.name)
            result_words.append(current)

            # Explore neighbours
            for edge in current.incoming + current.outgoing:
                collected_edges.append(edge)
                for nb in (edge.from_name, edge.to_name):
                    if nb not in seen and nb in self.words:
                        queue.append(self.words[nb])

            # Stop early if we just met the quota
            if len(result_words) == fetchSize:
                break

        # ────────────────────────────────────────────────────────────────
        # Deduplicate edges whose endpoints are both in `seen`
        # ────────────────────────────────────────────────────────────────
        edge_seen = set()
        result_edges: list[Edge] = []

        for edge in collected_edges:
            if edge.from_name in seen and edge.to_name in seen:
                key = (edge.edge_name, edge.from_name, edge.to_name, edge.double_edge)
                if key not in edge_seen:
                    edge_seen.add(key)
                    result_edges.append(edge)

        now = datetime.now()
        if not self.last_hard_update_tags or (now - self.last_hard_update_tags) > TIME_WINDOW:
            self.update_tags_meta()

        return {
            "words": result_words, 
            "edges": result_edges,
            "tags_meta": self.get_tags_meta()
        }

    def word_exist(self, word_name: str):
        return word_name in self.words

    def edge_exist(self, edge: Edge):
        outgoing = (edge.edge_name, edge.from_name, edge.to_name)
        
        # Case 1: For non-double edges, only check outgoing direction
        if not edge.double_edge:
            return outgoing in self.edges and not self.edges[outgoing].double_edge
        
        # Case 2: For double edges, check both directions
        if outgoing in self.edges:
            return self.edges[outgoing].double_edge
        incoming = (edge.edge_name, edge.to_name, edge.from_name)
        if incoming in self.edges:
            return self.edges[incoming].double_edge
        
        return False

    def edge_conflicts(self, edge: Edge):
        outgoing = (edge.edge_name, edge.from_name, edge.to_name)
        incoming = (edge.edge_name, edge.to_name, edge.from_name)
        if edge.double_edge == True:
            return outgoing in self.edges or incoming in self.edges
        else:
            if outgoing in self.edges:
                return True
            if incoming in self.edges:
                return self.edges[incoming].double_edge == True 
            return False

    def add_edges(self, edges: list[Edge]):
        for edge in edges:
            from_word = self.words[edge.from_name]
            from_word.outgoing.append(edge)
            to_word = self.words[edge.to_name]
            to_word.incoming.append(edge)
            self.edges[(edge.edge_name, edge.from_name, edge.to_name)] = edge

    # Hard update tags for the entire graph
    def update_tags_meta(self):
        self.tagsMeta = {}
        for word in self.words.values():
            for tag in word.tags:
                if tag not in self.tagsMeta:
                    self.tagsMeta[tag] = 1
                else:
                    self.tagsMeta[tag] += 1

    # Soft update tags for existence
    def update_tags_meta_soft(self, tags: list[str]):
        for tag in tags:
            if tag not in self.tagsMeta:
                self.tagsMeta[tag] = 1

    def get_tags_meta(self):
        return self.tagsMeta
    
    def update_word_data(self, wordname: str, note: str, tags: list[str]):
        self.words[wordname].note = note
        self.words[wordname].tags = tags
        self.update_tags_meta_soft(tags)

    # Brute force, can be optimized later.
    def search_tags(self, tags: list[str]):
        return {
            "words" : [word for word in self.words.values() if all(tag in word.tags for tag in tags)]
        }
    