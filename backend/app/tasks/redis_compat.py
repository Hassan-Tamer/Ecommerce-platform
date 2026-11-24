import redis.connection
import redis.utils

# This Redis server has no HELLO/RESP3. Kombu does not pass a protocol,
# and redis-py 8 defaults to RESP3, so force the same RESP2 default the app uses.
redis.utils.DEFAULT_RESP_VERSION = 2
redis.connection.DEFAULT_RESP_VERSION = 2
