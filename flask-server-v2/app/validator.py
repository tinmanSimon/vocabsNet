from app.graph import Graph
from core.vocab_types import Word, Edge, UserInfo, MAX_NAME_LENGTH
class Validator:
    async def _validate_word(
        self, 
        word: Word, 
        user: UserInfo, 
        word_should_exist: bool,
        graph: Graph
    ):
        if not word.name.strip() or not word.username.strip():
            raise ValueError(f"Invalid Word: '{word.name}'")
        if len(word.name) > MAX_NAME_LENGTH:
            raise ValueError(f"Word name exceeds max length ({MAX_NAME_LENGTH}): '{word.name}'")
        if word.username != user.username:
            raise ValueError(f"Word username does't match request username: {user.username}") 
        if graph.word_exist(word.name) != word_should_exist:
            raise ValueError(
                f"Word exist status: {graph.word_exist(word.name)}, "
                f"but should exist status: {word_should_exist}."
            ) 
    
    async def validate_words(
        self, 
        words:list[Word], 
        user: UserInfo, 
        word_should_exist: bool,
        graph: Graph
    ):
        unique_words = {(w.name, w.username): w for w in words}.values()
        if len(unique_words) != len(words):
            raise ValueError(f"Words have duplicate values")
        for word in words:
            await self._validate_word(word, user, word_should_exist, graph)

    async def _validate_edge(
        self, 
        edge, 
        user: UserInfo, 
        edge_should_exist: bool,
        graph: Graph
    ):
        if not edge.edge_name.strip() or not edge.username.strip():
            raise ValueError(f"Invalid edge: '{edge.edge_name}'")
        if not edge.from_name.strip() or not edge.to_name.strip():
            raise ValueError(f"Invalid edge from_name or to_name")
        if edge.from_name.strip() == edge.to_name.strip():
            raise ValueError(f"Invalid edge with the same from_name and to_name")
        if len(edge.edge_name) > MAX_NAME_LENGTH:
            raise ValueError(f"Edge name exceeds max length ({MAX_NAME_LENGTH}): '{edge.edge_name}'")
        if user.username != edge.username:
            raise ValueError(f"Edge's username does't match request username: {user.username}") 
        if not (graph.word_exist(edge.from_name) and graph.word_exist(edge.to_name)):
            raise ValueError(
                f"Edge connecting with non existing words. "
                f"from_name: {edge.from_name}, to_name: {edge.to_name}"
            ) 
        if graph.edge_exist(edge) != edge_should_exist:
            raise ValueError(
                f"Edge exist status: {graph.edge_exist(edge)}, "
                f"but should exist status: {edge_should_exist}."
            ) 

        # We only care about edge conflicts when adding edges.
        if (not edge_should_exist) and graph.edge_conflicts(edge):
            raise ValueError(
                f"Edge '{edge.edge_name}' from '{edge.from_name}' "
                f"to '{edge.to_name}' conflicts with existing edges"
            ) 

    # check if there's a conflict among the edges regardless of the graph.
    def _check_edge_conflicts(self, edges: list[Edge]):
        records = set()
        for edge in edges:
            outgoing = (edge.edge_name, edge.from_name, edge.to_name)
            if outgoing in records:
                return True 
            records.add(outgoing)

            if edge.double_edge == True:
                incoming = (edge.edge_name, edge.to_name, edge.from_name)
                if incoming in records: 
                    return True 
                records.add(incoming)
        return False

    async def validate_edges(
        self, 
        edges: list[Edge], 
        user: UserInfo, 
        edge_should_exist: bool,
        graph: Graph
    ):
        if self._check_edge_conflicts(edges):
            raise ValueError(f"Edges have conflict values")
        for edge in edges:
            await self._validate_edge(edge, user, edge_should_exist, graph)

    async def validate_word_data(self, wordname: str, note: str, tags: list[str], graph: Graph):
        if not graph.word_exist(wordname): 
            raise ValueError(f"Validation Error:'{wordname}' doesn't exist in graph!")
        elif not note and not tags:
            raise ValueError(f"Validation Error: trying to update '{wordname}' but the data is empty!")
    
    async def validate_search(self, wordname: str, graph: Graph):
        if not graph.word_exist(wordname): 
            raise ValueError(f"Validation Error:'{wordname}' doesn't exist in graph!")
        