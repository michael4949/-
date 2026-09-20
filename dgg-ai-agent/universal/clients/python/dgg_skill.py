"""
薯片AI智能体 · 通用 Skill 的 Python 客户端（DUS-1）
------------------------------------------------------------
自研平台若是 Python 写的，不需要把内核移植成 Python：这 11 个包是确定性纯函数，
用子进程（CLI）或本地 HTTP 调用即可，结果完全一致。

两种模式：

    from dgg_skill import Skill, Suite

    # 1) 子进程模式：无需常驻服务，调一次起一次 node（几十毫秒级）
    erp = Skill("/path/to/dist-universal/ai-erp")
    env = erp.invoke("run", {"dataset": "make"})
    print(env["ok"], env["data"]["kpi"])

    # 2) HTTP 模式：常驻服务，适合高频调用
    #    先起服务： PORT=8711 node adapters/http.js
    erp = Skill(base_url="http://127.0.0.1:8711")
    env = erp.invoke("run", {"dataset": "make"})

    # 整套 11 个
    suite = Suite("/path/to/dist-universal")
    print([s.id for s in suite])
    env = suite["ai-cfo"].invoke("run", {"dataset": "make"})

产品类 skill 的状态由调用方持有：

    env = erp.invoke("apply-action", {"data": state, "orderId": "SO-2609-0129", "key": "overtime"})
    state = env["data"]          # 带 mutates 标记的动作返回新副本，存回会话状态

只依赖标准库。Python 3.8+。
"""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional


class SkillError(RuntimeError):
    """动作返回 ok=false 且调用方要求 raise 时抛出。"""

    def __init__(self, envelope: Dict[str, Any]):
        self.envelope = envelope
        errs = envelope.get("errors") or [{"code": "E_RUNTIME", "message": "未知错误"}]
        super().__init__("; ".join(f"{e.get('code')}: {e.get('message')}" for e in errs))


class Skill:
    """一个通用 skill 包。给 package_dir 走子进程模式，给 base_url 走 HTTP 模式。"""

    def __init__(
        self,
        package_dir: Optional[str] = None,
        base_url: Optional[str] = None,
        node: str = "node",
        timeout: float = 60.0,
    ) -> None:
        if not package_dir and not base_url:
            raise ValueError("package_dir 与 base_url 至少给一个")
        self.dir = Path(package_dir).resolve() if package_dir else None
        self.base_url = base_url.rstrip("/") if base_url else None
        self.node = node
        self.timeout = timeout
        self._manifest: Optional[Dict[str, Any]] = None

    # ---------- 元信息 ----------
    @property
    def manifest(self) -> Dict[str, Any]:
        if self._manifest is None:
            if self.dir:
                self._manifest = json.loads((self.dir / "manifest.json").read_text("utf-8"))
            else:
                self._manifest = self._http("GET", "/manifest")
        return self._manifest

    @property
    def id(self) -> str:
        return self.manifest["id"]

    @property
    def name(self) -> str:
        return self.manifest["name"]

    @property
    def version(self) -> str:
        return self.manifest["version"]

    def actions(self) -> List[Dict[str, Any]]:
        return [
            {k: a.get(k) for k in ("name", "title", "kind", "mutates", "description", "input", "returns")}
            for a in self.manifest["actions"]
        ]

    def tools(self) -> List[Dict[str, Any]]:
        """OpenAI 风格的 function-calling 工具定义，可直接塞进大模型请求。"""
        return [
            {
                "type": "function",
                "function": {
                    "name": f"{self.id}_{a['name']}".replace("-", "_"),
                    "description": f"{a.get('title','')}：{a.get('description','')}",
                    "parameters": a.get("input", {"type": "object", "properties": {}}),
                },
            }
            for a in self.manifest["actions"]
        ]

    # ---------- 调用 ----------
    def invoke(self, action: str, input: Optional[Dict[str, Any]] = None, raise_on_error: bool = False) -> Dict[str, Any]:
        """调用一个动作，返回 DUS-1 信封 dict。raise_on_error=True 时失败抛 SkillError。"""
        payload = input or {}
        env = self._http("POST", f"/actions/{action}", payload) if self.base_url else self._cli(action, payload)
        if raise_on_error and not env.get("ok"):
            raise SkillError(env)
        return env

    def run(self, input: Optional[Dict[str, Any]] = None, **kw: Any) -> Dict[str, Any]:
        """一次成型动作的快捷方式。"""
        return self.invoke("run", {**(input or {}), **kw})

    def health(self) -> Dict[str, Any]:
        return self.invoke("health", {}).get("data", {})

    # ---------- 两种传输 ----------
    def _cli(self, action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        assert self.dir is not None
        cli = self.dir / "adapters" / "cli.js"
        proc = subprocess.run(
            [self.node, str(cli), action, "--input", "-"],
            input=json.dumps(payload, ensure_ascii=False),
            capture_output=True,
            text=True,
            timeout=self.timeout,
            cwd=str(self.dir),
        )
        out = (proc.stdout or "").strip()
        if not out:
            # CLI 不支持 stdin 时退回临时文件
            import tempfile

            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False)
                tmp = fh.name
            try:
                proc = subprocess.run(
                    [self.node, str(cli), action, "--input", tmp],
                    capture_output=True, text=True, timeout=self.timeout, cwd=str(self.dir),
                )
                out = (proc.stdout or "").strip()
            finally:
                os.unlink(tmp)
        if not out:
            raise RuntimeError(f"CLI 无输出：{(proc.stderr or '').strip()[:400]}")
        return json.loads(out)

    def _http(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        assert self.base_url is not None
        req = urllib.request.Request(
            self.base_url + path,
            method=method,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None,
            headers={"content-type": "application/json; charset=utf-8"},
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:  # 动作失败也走 4xx，信封在 body 里
            body = e.read().decode("utf-8")
            try:
                return json.loads(body)
            except json.JSONDecodeError:
                raise RuntimeError(f"HTTP {e.code}: {body[:400]}") from None

    def __repr__(self) -> str:  # pragma: no cover
        where = self.base_url or (str(self.dir) if self.dir else "?")
        return f"<Skill {self.id} v{self.version} @ {where}>"


class Suite:
    """dist-universal 目录下的 11 个包。"""

    def __init__(self, dist_dir: str, node: str = "node") -> None:
        self.dir = Path(dist_dir).resolve()
        registry = json.loads((self.dir / "skills.json").read_text("utf-8"))
        self.suite = registry["suite"]
        self._skills = {s["id"]: Skill(str(self.dir / s["id"]), node=node) for s in registry["skills"]}

    def __getitem__(self, skill_id: str) -> Skill:
        return self._skills[skill_id]

    def __iter__(self) -> Iterator[Skill]:
        return iter(self._skills.values())

    def __len__(self) -> int:
        return len(self._skills)

    def ids(self) -> List[str]:
        return list(self._skills)

    def tools(self) -> List[Dict[str, Any]]:
        """11 个包的全部动作，合成一张 function-calling 工具表。"""
        out: List[Dict[str, Any]] = []
        for s in self._skills.values():
            out.extend(s.tools())
        return out

    def dispatch(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """把大模型选中的工具名（<id>_<action>）派发回对应的 skill。"""
        for s in self._skills.values():
            prefix = s.id.replace("-", "_") + "_"
            if tool_name.startswith(prefix):
                return s.invoke(tool_name[len(prefix):].replace("_", "-"), arguments)
        raise KeyError(f"没有这个工具：{tool_name}")


if __name__ == "__main__":  # 冒烟：python dgg_skill.py <dist-universal 路径>
    import sys

    suite = Suite(sys.argv[1] if len(sys.argv) > 1 else "dist-universal")
    print(f"{suite.suite['name']} {suite.suite['version']} · {len(suite)} 个通用 skill")
    for sk in suite:
        h = sk.health()
        print(f"  {h['id']:<16} v{h['version']:<8} {h['actions']} 动作 · 内核{'一致' if h['versionMatch'] else '不一致!'}")
