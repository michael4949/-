"""模块四：智能标书生成（多 Agent 分模块并行生成）。"""
from .generator import BidGenerator
from .outline import build_outline
from .docx_writer import write_bid_docx

__all__ = ["BidGenerator", "build_outline", "write_bid_docx"]
