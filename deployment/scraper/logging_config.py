"""
Enhanced Logging Configuration for Scraper Backend
Auto-rotating logs with size and time-based rotation
"""

import os
import logging
import logging.handlers
from pathlib import Path
from datetime import datetime

# Configuration from environment
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_MAX_BYTES = int(os.getenv("LOG_MAX_BYTES", 52428800))  # 50MB default
LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", 5))
LOG_DIR = Path(os.getenv("LOG_DIR", "./logs"))

# Create log directory
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Log format
DETAILED_FORMAT = logging.Formatter(
    '[%(asctime)s] %(levelname)-8s %(name)-20s %(funcName)-20s:%(lineno)-4d - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

SIMPLE_FORMAT = logging.Formatter(
    '[%(asctime)s] %(levelname)-8s - %(message)s',
    datefmt='%H:%M:%S'
)


class ColoredConsoleFormatter(logging.Formatter):
    """Colored output for console"""
    
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record):
        log_color = self.COLORS.get(record.levelname, self.RESET)
        record.levelname = f"{log_color}{record.levelname}{self.RESET}"
        return super().format(record)


def setup_logging(app_name: str = "scraper"):
    """
    Setup comprehensive logging with rotation
    
    Args:
        app_name: Name of the application (used for log file naming)
    
    Returns:
        logging.Logger: Configured logger instance
    """
    
    logger = logging.getLogger(app_name)
    logger.setLevel(getattr(logging, LOG_LEVEL))
    logger.handlers.clear()
    
    # 1. Console Handler (colored, INFO+)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = ColoredConsoleFormatter(
        '[%(asctime)s] %(levelname)-8s - %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # 2. Rotating File Handler - All logs (DEBUG+)
    all_log_file = LOG_DIR / f"{app_name}_all.log"
    all_handler = logging.handlers.RotatingFileHandler(
        all_log_file,
        maxBytes=LOG_MAX_BYTES,
        backupCount=LOG_BACKUP_COUNT,
        encoding='utf-8'
    )
    all_handler.setLevel(logging.DEBUG)
    all_handler.setFormatter(DETAILED_FORMAT)
    logger.addHandler(all_handler)
    
    # 3. Rotating File Handler - Errors only (ERROR+)
    error_log_file = LOG_DIR / f"{app_name}_errors.log"
    error_handler = logging.handlers.RotatingFileHandler(
        error_log_file,
        maxBytes=LOG_MAX_BYTES // 5,  # Smaller for errors
        backupCount=LOG_BACKUP_COUNT * 2,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(DETAILED_FORMAT)
    logger.addHandler(error_handler)
    
    # 4. Timed Rotating Handler - Daily logs
    daily_log_file = LOG_DIR / f"{app_name}_daily.log"
    daily_handler = logging.handlers.TimedRotatingFileHandler(
        daily_log_file,
        when='midnight',
        interval=1,
        backupCount=30,  # Keep 30 days
        encoding='utf-8'
    )
    daily_handler.setLevel(logging.INFO)
    daily_handler.setFormatter(DETAILED_FORMAT)
    daily_handler.suffix = "%Y%m%d"
    logger.addHandler(daily_handler)
    
    # Log initialization
    logger.info("=" * 60)
    logger.info(f"Logging initialized for {app_name}")
    logger.info(f"Log Level: {LOG_LEVEL}")
    logger.info(f"Log Directory: {LOG_DIR}")
    logger.info(f"Max Size: {LOG_MAX_BYTES / 1024 / 1024:.1f}MB")
    logger.info(f"Backup Count: {LOG_BACKUP_COUNT}")
    logger.info("=" * 60)
    
    return logger


def get_logger(name: str = None):
    """Get a child logger"""
    if name:
        return logging.getLogger(f"scraper.{name}")
    return logging.getLogger("scraper")


# Cleanup old logs function
def cleanup_old_logs(days: int = 30):
    """Remove log files older than specified days"""
    import time
    
    logger = get_logger("cleanup")
    deleted_count = 0
    
    try:
        current_time = time.time()
        for log_file in LOG_DIR.glob("*.log*"):
            file_age_days = (current_time - log_file.stat().st_mtime) / 86400
            
            if file_age_days > days:
                log_file.unlink()
                deleted_count += 1
                logger.info(f"Deleted old log: {log_file.name} (age: {file_age_days:.1f} days)")
        
        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old log files")
        
    except Exception as e:
        logger.error(f"Error cleaning up logs: {e}")


# Example usage
if __name__ == "__main__":
    # Test logging
    logger = setup_logging("test_app")
    
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    logger.critical("This is a critical message")
    
    # Test child logger
    child_logger = get_logger("module1")
    child_logger.info("Child logger message")
    
    print(f"\n✅ Log files created in: {LOG_DIR}")
    print(f"   - {LOG_DIR}/test_app_all.log")
    print(f"   - {LOG_DIR}/test_app_errors.log")
    print(f"   - {LOG_DIR}/test_app_daily.log")
