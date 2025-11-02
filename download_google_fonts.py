#!/usr/bin/env python3
"""
Smart Google Fonts Downloader
Priority: Regular/Static first → Variable font as fallback
"""

import requests
import os
import sys
from pathlib import Path

# ============================================
# 📝 CONFIGURATION: ADD YOUR FONTS HERE
# ============================================
FONTS_TO_DOWNLOAD = [
    "Great Vibes",
    "Alex Brush",
    "Allura",
    "Pacifico",
    # "Lucida Calligraphy",  # NOT on Google Fonts (Microsoft system font)
    "Montserrat",
    "Playfair Display",
    "Bree Serif",
    "Tourney",
]

# Output directory for downloaded fonts
OUTPUT_DIR = "static/fonts"

# GitHub base URL
GITHUB_BASE_URL = "https://github.com/google/fonts/raw/main"


class GoogleFontsDownloader:
    def __init__(self, output_dir=OUTPUT_DIR):
        self.output_dir = output_dir
        
        # Create output directory
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
    
    def download_font(self, font_name):
        """
        Download a single font TTF file
        Priority: Regular/Static → Variable font fallback
        """
        print(f"\n{'='*60}")
        print(f"📦 Processing: {font_name}")
        print('='*60)
        
        # Convert to GitHub slug (lowercase, no spaces)
        font_slug = font_name.lower().replace(" ", "")
        font_clean = font_name.replace(' ', '')
        
        # PRIORITY ORDER: Static Regular first, Variable as fallback
        patterns = [
            # ========================================
            # PRIORITY 1: Static Regular weights
            # ========================================
            f"{font_clean}-Regular.ttf",
            f"{font_clean}.ttf",
            f"static/{font_clean}-Regular.ttf",
            f"static/{font_clean}Regular.ttf",
            
            # Medium weight (common alternative to Regular)
            f"{font_clean}-Medium.ttf",
            f"static/{font_clean}-Medium.ttf",
            f"static/{font_clean}Medium.ttf",
            
            # Other common weight names
            f"{font_clean}-normal.ttf",
            f"static/{font_clean}-400.ttf",
            f"static/{font_clean}-Normal.ttf",
            
            # ========================================
            # PRIORITY 2: Variable fonts (FALLBACK)
            # ========================================
            f"{font_clean}-VariableFont_wght.ttf",
            f"{font_clean}[wght].ttf",
            f"{font_clean}-Variable.ttf",
        ]
        
        print(f"🔍 Searching for font file...")
        
        for pattern in patterns:
            # Try both ofl and apache directories
            for license_dir in ['ofl', 'apache', 'ufl']:
                url = f"{GITHUB_BASE_URL}/{license_dir}/{font_slug}/{pattern}"
                
                try:
                    response = requests.get(url, timeout=15, allow_redirects=True)
                    
                    if response.status_code == 200:
                        # Verify it's actually a font file (TTF magic bytes)
                        if response.content[:4] in [b'\x00\x01\x00\x00', b'OTTO', b'ttcf']:
                            # Save the file
                            output_filename = f"{font_clean}.ttf"
                            output_path = os.path.join(self.output_dir, output_filename)
                            
                            with open(output_path, 'wb') as f:
                                f.write(response.content)
                            
                            size_kb = len(response.content) / 1024
                            
                            # Determine font type
                            font_type = "Variable" if "Variable" in pattern or "[wght]" in pattern else "Static Regular"
                            
                            print(f"✅ Downloaded successfully!")
                            print(f"   Type: {font_type}")
                            print(f"   Source: {pattern}")
                            print(f"   File: {output_filename}")
                            print(f"   Size: {size_kb:.1f} KB")
                            print(f"   Path: {output_path}")
                            
                            return True
                        
                except requests.RequestException:
                    continue
        
        print(f"\n❌ Could not find TTF for {font_name}")
        print(f"   Manual: https://fonts.google.com/specimen/{font_name.replace(' ', '+')}")
        return False
    
    def download_batch(self, font_list):
        """Download multiple fonts"""
        print(f"\n🎨 Google Fonts Batch Downloader")
        print(f"{'='*60}")
        print(f"Fonts to download: {len(font_list)}")
        print(f"Output directory: {self.output_dir}")
        print('='*60)
        
        success_count = 0
        failed_fonts = []
        downloaded_fonts = []
        
        for font_name in font_list:
            if self.download_font(font_name):
                success_count += 1
                downloaded_fonts.append(font_name)
            else:
                failed_fonts.append(font_name)
        
        # Summary
        print(f"\n{'='*60}")
        print(f"📊 Download Summary")
        print('='*60)
        print(f"✅ Successful: {success_count}/{len(font_list)}")
        
        if downloaded_fonts:
            print(f"\n✅ Successfully Downloaded:")
            for font in downloaded_fonts:
                print(f"   • {font}")
        
        if failed_fonts:
            print(f"\n❌ Failed: {len(failed_fonts)}")
            for font in failed_fonts:
                print(f"   • {font}")
        
        if success_count > 0:
            print(f"\n💾 Fonts saved to: {self.output_dir}/")
            print(f"\n📝 Next Steps:")
            print(f"   1. Add fonts to Flask FONT_MAP in api/index.py")
            print(f"   2. Add font options to HTML dropdown")
            print(f"   3. Update Google Fonts link in HTML <head>")
            print(f"   4. Commit and push to deploy")
        
        return success_count, failed_fonts


def main():
    """Main execution"""
    downloader = GoogleFontsDownloader(OUTPUT_DIR)
    
    if len(sys.argv) > 1:
        # Use command line arguments
        fonts = sys.argv[1:]
    else:
        # Use FONTS_TO_DOWNLOAD configuration
        fonts = FONTS_TO_DOWNLOAD
    
    # Download all fonts
    success, failed = downloader.download_batch(fonts)
    
    # Exit with appropriate code
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
