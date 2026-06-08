"""极简 StateGraph（对标 LangGraph 的核心心智模型）。

提供 add_node / add_edge / add_conditional_edges / set_entry 与编译执行，
共享一个可变 state 在节点间流转。生产环境可平滑替换为 langgraph.graph.StateGraph
（节点函数签名一致：state -> state）。
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Tuple

END = "__end__"

NodeFn = Callable[[Any], Any]
Router = Callable[[Any], str]


class StateGraph:
    def __init__(self):
        self._nodes: Dict[str, NodeFn] = {}
        self._edges: Dict[str, str] = {}
        self._cond: Dict[str, Tuple[Router, Dict[str, str]]] = {}
        self._entry: Optional[str] = None

    def add_node(self, name: str, fn: NodeFn) -> "StateGraph":
        self._nodes[name] = fn
        return self

    def add_edge(self, src: str, dst: str) -> "StateGraph":
        self._edges[src] = dst
        return self

    def add_conditional_edges(self, src: str, router: Router, mapping: Dict[str, str]) -> "StateGraph":
        self._cond[src] = (router, mapping)
        return self

    def set_entry(self, name: str) -> "StateGraph":
        self._entry = name
        return self

    def compile(self) -> "CompiledGraph":
        if self._entry is None:
            raise ValueError("未设置入口节点")
        return CompiledGraph(self._nodes, self._edges, self._cond, self._entry)


class CompiledGraph:
    def __init__(self, nodes, edges, cond, entry):
        self._nodes = nodes
        self._edges = edges
        self._cond = cond
        self._entry = entry

    def invoke(self, state: Any, max_steps: int = 50) -> Any:
        current = self._entry
        steps = 0
        while current and current != END and steps < max_steps:
            steps += 1
            fn = self._nodes.get(current)
            if fn is None:
                raise ValueError(f"未知节点：{current}")
            result = fn(state)
            if result is not None:
                state = result
            # 决定下一节点
            if current in self._cond:
                router, mapping = self._cond[current]
                key = router(state)
                current = mapping.get(key, END)
            else:
                current = self._edges.get(current, END)
        return state
