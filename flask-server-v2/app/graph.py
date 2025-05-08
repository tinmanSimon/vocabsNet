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
    
    def update_note(self, wordname: str, note: str):
        self.words[wordname].note = note
