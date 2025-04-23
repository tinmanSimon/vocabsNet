from typing import Set, List, Optional
from core.vocab_types import Word, Edge
from typing import Dict, Tuple


class Graph:
    def __init__(self):
        self.words: Dict[str, Word] = {}
        self.edges: Dict[Tuple[str, str, str], Edge] = {}

    def add_words(self, words: list[Word]):
        for word in words:
            self.words[word.name] = word

    def get_all_data(self):
        return {
            "words" : list(self.words.values()),
            "edges" : list(self.edges.values())
        }

    def word_exist(self, word_name: str):
        return word_name in self.words

    def edge_exist(self, edge: Edge):
        return (edge.edge_name, edge.from_name, edge.to_name) in self.edges

    def add_edges(self, edges: list[Edge]):
        for edge in edges:
            from_word = self.words[edge.from_name]
            from_word.outgoing.append(edge)
            to_word = self.words[edge.to_name]
            to_word.incoming.append(edge)
            self.edges[(edge.edge_name, edge.from_name, edge.to_name)] = edge
    
