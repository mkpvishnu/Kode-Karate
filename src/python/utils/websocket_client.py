import asyncio
import json
import websockets
from typing import Dict, Any, Optional, Callable
from .logging import get_logger

logger = get_logger(__name__)

class WebSocketClient:
    def __init__(self, uri: str):
        self.uri = uri
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.message_handlers: Dict[str, Callable] = {}

    async def connect(self):
        """Connect to the WebSocket server."""
        try:
            self.websocket = await websockets.connect(self.uri)
            logger.info(f"Connected to WebSocket server at {self.uri}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to WebSocket: {e}")
            return False

    async def send_message(self, message_type: str, **kwargs):
        """Send a message to the WebSocket server."""
        if not self.websocket:
            logger.error("WebSocket not connected")
            return False

        message = {
            "type": message_type,
            **kwargs
        }

        try:
            await self.websocket.send(json.dumps(message))
            return True
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False

    def register_handler(self, message_type: str, handler: Callable[[Dict[str, Any]], None]):
        """Register a handler for a specific message type."""
        self.message_handlers[message_type] = handler

    async def start_listening(self):
        """Start listening for messages."""
        if not self.websocket:
            logger.error("WebSocket not connected")
            return

        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    message_type = data.get('type')
                    
                    if message_type in self.message_handlers:
                        await self.message_handlers[message_type](data)
                    else:
                        logger.warning(f"No handler for message type: {message_type}")
                        
                except json.JSONDecodeError:
                    logger.error("Failed to parse WebSocket message")
                
        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket connection closed")
        except Exception as e:
            logger.error(f"Error in WebSocket listener: {e}")

    async def close(self):
        """Close the WebSocket connection."""
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
            logger.info("WebSocket connection closed")

    @staticmethod
    def create_message(message_type: str, **kwargs) -> Dict[str, Any]:
        """Create a formatted message."""
        return {
            "type": message_type,
            **kwargs
        }