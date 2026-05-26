import asyncio
import logging
import os
from pathlib import Path
from typing import Optional

from playwright.async_api import (
    Browser,
    BrowserContext,
    Page,
    TimeoutError as PlaywrightTimeout,
    async_playwright,
)

log = logging.getLogger("lovart-client")

LOVART_BASE_URL = os.getenv("LOVART_BASE_URL", "https://www.lovart.ai")
NAV_TIMEOUT_MS = int(os.getenv("LOVART_NAV_TIMEOUT_MS", "60000"))
GENERATION_TIMEOUT_MS = int(os.getenv("LOVART_GENERATION_TIMEOUT_MS", "300000"))


class LovartError(Exception):
    pass


class LovartClient:
    """
    Browser automation client for lovart.ai.

    lovart.ai does not expose a public API; this class drives the website with
    Playwright. The SEL_* selectors below are placeholders — inspect the live
    site with your account and tune them. Run locally with HEADLESS=false to
    watch the browser and iterate.

    Storage state (cookies + localStorage) is persisted across runs so you
    don't have to log in every time. First-time login may require completing
    a CAPTCHA or 2FA manually.
    """

    # === Tune these against the live lovart.ai UI ===
    SEL_LOGIN_BUTTON = (
        'button:has-text("Log in"), a:has-text("Log in"), '
        'button:has-text("Sign in"), a:has-text("Sign in")'
    )
    SEL_EMAIL_INPUT = 'input[type="email"], input[name="email"]'
    SEL_PASSWORD_INPUT = 'input[type="password"], input[name="password"]'
    SEL_SUBMIT_LOGIN = 'button[type="submit"]'
    SEL_PROMPT_INPUT = 'textarea, [contenteditable="true"]'
    SEL_SUBMIT_PROMPT = (
        'button[type="submit"], button:has-text("Generate"), '
        'button:has-text("Create")'
    )
    SEL_RESULT_IMAGE = 'img[src*="lovart"], img[src*="cdn"], img[src*="generated"]'
    # ================================================

    def __init__(
        self,
        email: str,
        password: str,
        *,
        headless: bool = True,
        artifacts_dir: Optional[Path] = None,
        storage_state_path: Optional[Path] = None,
    ):
        self.email = email
        self.password = password
        self.headless = headless
        self.artifacts_dir = artifacts_dir or Path("/tmp/lovart-artifacts")
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        self.storage_state_path = storage_state_path or Path(
            os.getenv("LOVART_STORAGE_STATE", "/tmp/lovart-state.json")
        )
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._screenshot_idx = 0

    async def __aenter__(self):
        await self._launch()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()

    async def _launch(self) -> None:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ],
        )
        context_kwargs: dict = {
            "user_agent": (
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            "viewport": {"width": 1440, "height": 900},
        }
        if self.storage_state_path.exists():
            context_kwargs["storage_state"] = str(self.storage_state_path)
            log.info("Loaded storage state from %s", self.storage_state_path)
        self._context = await self._browser.new_context(**context_kwargs)
        self._page = await self._context.new_page()
        self._page.set_default_timeout(NAV_TIMEOUT_MS)

    async def close(self) -> None:
        try:
            if self._context:
                try:
                    await self._context.storage_state(path=str(self.storage_state_path))
                    log.info("Saved storage state to %s", self.storage_state_path)
                except Exception:
                    log.warning("Could not save storage state", exc_info=True)
                await self._context.close()
            if self._browser:
                await self._browser.close()
            if self._playwright:
                await self._playwright.stop()
        except Exception:
            log.warning("Error during browser teardown", exc_info=True)

    async def _shot(self, label: str) -> None:
        if not self._page:
            return
        self._screenshot_idx += 1
        path = self.artifacts_dir / f"step-{self._screenshot_idx:02d}-{label}.png"
        try:
            await self._page.screenshot(path=str(path), full_page=True)
            log.info("Screenshot: %s", path)
        except Exception:
            log.warning("Screenshot failed: %s", label, exc_info=True)

    async def login(self) -> None:
        assert self._page is not None
        page = self._page
        log.info("Navigating to %s", LOVART_BASE_URL)
        await page.goto(LOVART_BASE_URL, wait_until="domcontentloaded")
        await self._shot("landing")

        if await self._is_logged_in():
            log.info("Already logged in via stored session")
            return

        try:
            await page.locator(self.SEL_LOGIN_BUTTON).first.click(timeout=15000)
        except PlaywrightTimeout:
            log.info("No explicit login button found; assuming on login page")

        try:
            await page.locator(self.SEL_EMAIL_INPUT).first.fill(
                self.email, timeout=15000
            )
            await page.locator(self.SEL_PASSWORD_INPUT).first.fill(
                self.password, timeout=5000
            )
        except PlaywrightTimeout as exc:
            await self._shot("login-no-input")
            raise LovartError(
                "Could not find email/password input. lovart.ai may use SSO "
                "(Google/etc.) or selectors changed. Inspect and update SEL_* "
                "in lovart_client.py."
            ) from exc

        await self._shot("login-filled")
        try:
            await page.locator(self.SEL_SUBMIT_LOGIN).first.click(timeout=5000)
        except PlaywrightTimeout:
            await page.keyboard.press("Enter")

        try:
            await page.wait_for_load_state("networkidle", timeout=NAV_TIMEOUT_MS)
        except PlaywrightTimeout:
            pass
        await self._shot("after-login")

        if not await self._is_logged_in():
            raise LovartError(
                "Login appears to have failed. Possible causes: wrong "
                "credentials, CAPTCHA/2FA, SSO required, selectors out of "
                "date. Set HEADLESS=false and inspect the screenshots."
            )

    async def _is_logged_in(self) -> bool:
        assert self._page is not None
        url = self._page.url.lower()
        if any(s in url for s in ("login", "signin", "sign-in", "sign_in")):
            return False
        try:
            await self._page.locator(self.SEL_PROMPT_INPUT).first.wait_for(
                state="visible", timeout=5000
            )
            return True
        except PlaywrightTimeout:
            return False

    async def generate(self, prompt: str, count: int = 1) -> list[Path]:
        """
        Submit a prompt and return paths to the downloaded artifacts.
        """
        assert self._page is not None and self._context is not None
        page = self._page

        log.info("Submitting prompt (count=%d)", count)
        try:
            prompt_input = page.locator(self.SEL_PROMPT_INPUT).first
            await prompt_input.click()
            await prompt_input.fill(prompt)
            await self._shot("prompt-filled")
        except PlaywrightTimeout as exc:
            await self._shot("prompt-not-found")
            raise LovartError(
                "Could not find prompt input. Update SEL_PROMPT_INPUT."
            ) from exc

        try:
            await page.locator(self.SEL_SUBMIT_PROMPT).first.click(timeout=5000)
        except PlaywrightTimeout:
            await page.keyboard.press("Enter")

        log.info("Waiting for results (timeout=%ds)...", GENERATION_TIMEOUT_MS // 1000)
        try:
            await page.locator(self.SEL_RESULT_IMAGE).first.wait_for(
                state="visible", timeout=GENERATION_TIMEOUT_MS
            )
        except PlaywrightTimeout as exc:
            await self._shot("generation-timeout")
            raise LovartError(
                f"Timed out after {GENERATION_TIMEOUT_MS // 1000}s waiting for "
                "result. Tune SEL_RESULT_IMAGE or increase "
                "LOVART_GENERATION_TIMEOUT_MS."
            ) from exc

        await asyncio.sleep(2)
        await self._shot("results")

        images = await page.locator(self.SEL_RESULT_IMAGE).all()
        log.info("Found %d candidate result image(s)", len(images))

        saved: list[Path] = []
        for idx, img in enumerate(images[:count]):
            try:
                src = await img.get_attribute("src")
                if not src or src.startswith("data:"):
                    continue
                response = await self._context.request.get(src)
                if not response.ok:
                    log.warning(
                        "Image %d download failed (status=%d): %s",
                        idx,
                        response.status,
                        src,
                    )
                    continue
                ct = response.headers.get("content-type", "image/png")
                ext = "png" if "png" in ct else (
                    "jpg" if ("jpeg" in ct or "jpg" in ct) else "bin"
                )
                out = self.artifacts_dir / f"result-{idx + 1:02d}.{ext}"
                out.write_bytes(await response.body())
                saved.append(out)
                log.info("Saved %s", out)
            except Exception:
                log.warning("Failed to download image %d", idx, exc_info=True)

        if not saved:
            raise LovartError(
                "Result images detected but none could be downloaded. "
                "They may be inside a canvas / blob URL — adjust the "
                "download strategy."
            )
        return saved
