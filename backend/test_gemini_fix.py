import os
import sys
from pathlib import Path
import logging

# Add the backend directory to the Python path to import modules
sys.path.insert(0, str(Path(__file__).resolve().parent))

from llm_fix_generator import generate_ai_fix, GEMINI_API_KEY, GEMINI_MODEL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_gemini_test():
    print("--- Gemini Integration Test ---")

    gemini_key_loaded = bool(GEMINI_API_KEY)
    print(f"GEMINI KEY LOADED: {gemini_key_loaded}")
    print(f"GEMINI MODEL: {GEMINI_MODEL}")

    if not gemini_key_loaded:
        print("Gemini API key is not loaded. Please ensure D:\\cyberapp\\.env exists and contains GEMINI_API_KEY.")
        return

    # Use a sample vulnerability from the provided owasp-results/dependency-check-report.json
    sample_vulnerability = {
        "package_name": "@babel/core",
        "installed_version": "7.29.0",
        "fixed_version": "7.29.6",
        "cve_id": "GHSA-4x5r-pxfx-6jf8",
        "severity": "LOW",
        "cvss_score": 3.2,
        "description": "Using `@babel/core` to compile maliciously crafted code can allow an attacker to read any source map from the system that is running Babel, if these conditions are _all_ true: the attacker controls the input source code, the attacker can read the output source code, and the attacker knows the path of the source map file that they want to read. Users that only compile trusted code are not impacted. The vulnerability has been fixed in `@babel/core@7.29.6` and `@babel/core@8.0.0-rc.6`.",
        "reference_url": "https://github.com/babel/babel/security/advisories/GHSA-4x5r-pxfx-6jf8"
    }

    print("\nAttempting to generate AI fix suggestion...")
    fix_result = generate_ai_fix(sample_vulnerability)
    fix_suggestion = fix_result.get("fix_suggestion")
    fix_confidence = fix_result.get("fix_confidence")

    if "AI remediation pending" in fix_suggestion or "fallback" in fix_suggestion.lower():
        print("Gemini test: FELL BACK to default remediation.")
        print(f"Fallback reason: {fix_suggestion}")
    else:
        print("Gemini test: USED GEMINI SUCCESSFULLY.")
        print(f"Fix Suggestion: {fix_suggestion}")
        print(f"Fix Confidence: {fix_confidence}")

if __name__ == "__main__":
    run_gemini_test()