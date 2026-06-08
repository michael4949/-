"""模块一：招标文件解析（Word / PDF / 文本）。"""
from .document_parser import parse_document, SUPPORTED_EXTS

__all__ = ["parse_document", "SUPPORTED_EXTS"]
