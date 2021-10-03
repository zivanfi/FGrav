#!/usr/bin/env bash
if [[ ! -x "$(command -v docker)" ]]; then
    echo "Could not find docker executable"
    if [[ ! -x "$(command -v python3)" ]]; then
        exit 1
    fi
    echo "Falling back to Python, but file selectors won't work (URL-s must be assembled manually)"
fi

# emulate readlink -f in order for the script to work on macOS (which fails to have the -f operand) and not just Linux. sigh.
DIR=./web
cd `dirname $DIR`
DIR=`basename $DIR`
while [ -L "$DIR" ]
do
    DIR=`readlink $DIR`
    cd `dirname $DIR`
    DIR=`basename $DIR`
done
PHYS_DIR=`pwd -P`
ROOT_DIR="$PHYS_DIR/$DIR"

if [[ ! -d "$ROOT_DIR" ]]; then
    echo "Run the deploy.sh script first!"
    exit 1
fi

PORT="9090"

if [[ "$1" != "" ]]; then
    PORT="$1"
fi

echo "Launching FGrav server at http://localhost:$PORT from $ROOT_DIR"
if [[ -x "$(command -v docker)" ]]; then
    docker container run -v "$ROOT_DIR:/usr/share/nginx/html:ro" -v "$ROOT_DIR/nginx.conf:/etc/nginx/conf.d/default.conf" -v "$ROOT_DIR:/etc/nginx/html:ro" -p "127.0.0.1:$PORT:80" nginx
else
    python3 -m http.server --bind 127.0.0.1 "$PORT" -d "$ROOT_DIR"
fi
