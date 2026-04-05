"""Builds a graph model of table/field relationships."""
from typing import Any


class RelationshipMapper:
    """Converts a list of relationship dicts into an adjacency graph."""

    def build_graph(self, relationships: list[dict[str, str]]) -> dict[str, Any]:
        """
        Build an adjacency graph from relationships.

        Returns:
            {
                "nodes": ["orders", "customers", ...],
                "edges": [{"from": "orders", "to": "customers", "key": "customer_id"}, ...]
            }
        """
        nodes: set[str] = set()
        edges: list[dict[str, str]] = []

        for rel in relationships:
            nodes.add(rel["from_table"])
            nodes.add(rel["to_table"])
            edges.append({
                "from": rel["from_table"],
                "to": rel["to_table"],
                "key": rel["join_key"],
            })

        return {"nodes": sorted(nodes), "edges": edges}

    def find_join_paths(self, graph: dict[str, Any], source: str, target: str) -> list[list[str]]:
        """BFS to find all simple paths between two tables in the graph."""
        adjacency: dict[str, list[str]] = {}
        for edge in graph["edges"]:
            adjacency.setdefault(edge["from"], []).append(edge["to"])
            adjacency.setdefault(edge["to"], []).append(edge["from"])

        paths: list[list[str]] = []
        queue: list[list[str]] = [[source]]

        while queue:
            path = queue.pop(0)
            node = path[-1]
            if node == target:
                paths.append(path)
                continue
            for neighbour in adjacency.get(node, []):
                if neighbour not in path:
                    queue.append(path + [neighbour])

        return paths

    def get_degree_centrality(self, graph: dict[str, Any]) -> dict[str, int]:
        """Return node degree (number of edges) for each table."""
        degree: dict[str, int] = {n: 0 for n in graph["nodes"]}
        for edge in graph["edges"]:
            degree[edge["from"]] = degree.get(edge["from"], 0) + 1
            degree[edge["to"]] = degree.get(edge["to"], 0) + 1
        return degree
