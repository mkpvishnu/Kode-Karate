import os
import json
import shutil
import ssl
import certifi
import urllib.request
from pathlib import Path
from typing import Optional
from .utils.logging import get_logger

logger = get_logger(__name__)

class JarManager:
    def __init__(self, extension_path: Path):
        self.extension_path = extension_path
        self.jar_path = extension_path / 'resources' / 'karate.jar'
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())

    def ensure_jar(self) -> str:
        """Ensure the Karate JAR exists and return its path."""
        try:
            if not self.jar_exists():
                logger.info("Karate JAR not found. Downloading...")
                self.download_jar()
            return str(self.jar_path)
        except Exception as e:
            logger.error(f"Error ensuring JAR: {str(e)}")
            raise

    def jar_exists(self) -> bool:
        """Check if the Karate JAR exists."""
        return self.jar_path.exists()

    def get_jar_version(self) -> Optional[str]:
        """Get the version of the installed JAR."""
        version_file = self.extension_path / 'resources' / 'version.json'
        if version_file.exists():
            try:
                with open(version_file, 'r') as f:
                    data = json.load(f)
                    return data.get('version')
            except Exception as e:
                logger.error(f"Error reading version file: {str(e)}")
        return None

    def download_jar(self) -> None:
        """Download the Karate JAR from the official source."""
        # Create resources directory if it doesn't exist
        self.jar_path.parent.mkdir(parents=True, exist_ok=True)
        
        # JAR URL and version
        jar_version = "1.4.0"
        jar_url = f"https://github.com/karatelabs/karate/releases/download/v{jar_version}/karate-{jar_version}.jar"
        
        try:
            # Configure opener with SSL context
            opener = urllib.request.build_opener(
                urllib.request.HTTPSHandler(context=self.ssl_context)
            )
            
            logger.info(f"Downloading Karate JAR from {jar_url}")
            with opener.open(jar_url) as response, open(self.jar_path, 'wb') as out_file:
                shutil.copyfileobj(response, out_file)
            
            # Save version information
            version_file = self.extension_path / 'resources' / 'version.json'
            with open(version_file, 'w') as f:
                json.dump({'version': jar_version}, f)
                
            logger.info("Successfully downloaded Karate JAR")
            
        except Exception as e:
            logger.error(f"Failed to download JAR: {str(e)}")
            raise

    def cleanup(self) -> None:
        """Clean up any temporary files."""
        try:
            if self.jar_path.exists():
                self.jar_path.unlink()
            version_file = self.extension_path / 'resources' / 'version.json'
            if version_file.exists():
                version_file.unlink()
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")