import json
import logging
import sys
from typing import Any, Dict

class JsonFormatter(logging.Formatter):
    """Custom formatter that outputs log messages as JSON."""
    
    def format(self, record: logging.LogRecord) -> str:
        message = {
            'type': 'log',
            'level': record.levelname,
            'message': record.getMessage()
        }
        
        if hasattr(record, 'data'):
            message['data'] = record.data
            
        if record.exc_info:
            message['error'] = self.formatException(record.exc_info)
            
        return json.dumps(message)

def setup_logging(name: str = 'KarateRunner', level: int = logging.INFO) -> logging.Logger:
    """Set up logging with JSON formatting."""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler with JSON formatter
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    
    return logger

class LoggerAdapter(logging.LoggerAdapter):
    """Custom adapter that allows adding structured data to log messages."""
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        extra = kwargs.get('extra', {})
        if 'data' in kwargs:
            extra['data'] = kwargs.pop('data')
        kwargs['extra'] = extra
        return msg, kwargs

def get_logger(name: str = 'KarateRunner') -> LoggerAdapter:
    """Get a logger with the custom adapter."""
    logger = setup_logging(name)
    return LoggerAdapter(logger, {})