#!/bin/bash

### Shell script to spin up a docker container for db2.

## color codes
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
CYAN='\033[1;36m'
PLAIN='\033[0m'

## variables
DB2_CONTAINER="db2_c"
HOST="localhost"
PORT=50000
USER="db2inst1"
PASSWORD="DBpa55"
DATABASE="TESTDB"
SCHEMA="DB2INST1"
if [ "$1" ]; then
    HOST=$1
fi
if [ "$2" ]; then
    PORT=$2
fi
if [ "$3" ]; then
    PASSWORD=$3
fi
if [ "$4" ]; then
    DATABASE=$4
fi

## check if docker exists
printf "\n${RED}>> Checking for docker${PLAIN} ${GREEN}...${PLAIN}"
docker -v > /dev/null 2>&1
DOCKER_EXISTS=$?
if [ "$DOCKER_EXISTS" -ne 0 ]; then
    printf "\n\n${CYAN}Status: ${PLAIN}${RED}Docker not found. Terminating setup.${PLAIN}\n\n"
    exit 1
fi
printf "\n${CYAN}Found docker. Moving on with the setup.${PLAIN}\n"

## cleaning up previous builds
printf "\n${RED}>> Finding old builds and cleaning up${PLAIN} ${GREEN}...${PLAIN}"
docker rm -f $DB2_CONTAINER > /dev/null 2>&1
printf "\n${CYAN}Clean up complete.${PLAIN}\n"

## pull latest db2 image
printf "\n${RED}>> Pulling latest db2 image${PLAIN} ${GREEN}...${PLAIN}"
docker pull ibmcom/db2express-c:latest > /dev/null 2>&1
printf "\n${CYAN}Image successfully built.${PLAIN}\n"

## run the db2 container
printf "\n${RED}>> Starting the db2 container${PLAIN} ${GREEN}...${PLAIN}\n"
CONTAINER_STATUS=$(docker run --name $DB2_CONTAINER -e LICENSE=accept -e DB2INST1_PASSWORD=$PASSWORD -p $PORT:50000 -d ibmcom/db2express-c:latest db2start 2>&1)
if [[ "$CONTAINER_STATUS" == *"Error"* ]]; then
    printf "\n\n${CYAN}Status: ${PLAIN}${RED}Error starting container. Terminating setup.${PLAIN}\n\n"
    exit 1
fi
docker cp ./test/tables.sql $DB2_CONTAINER:/home/ > /dev/null 2>&1

TIMEOUT=120
TIME_PASSED=0
WAIT_STRING="."

printf "\n${GREEN}Waiting for database to respond $WAIT_STRING${PLAIN}"
while [ "$TIMEOUT" -gt 0 ]
    do
        sleep 1s
        TIMEOUT=$((TIMEOUT - 1))
        TIME_PASSED=$((TIME_PASSED + 1))

        if [ "$TIME_PASSED" -eq 5 ]; then
            printf "${GREEN}.${PLAIN}"
            TIME_PASSED=0
        fi
    done
printf "\n${CYAN}Container is up and running.${PLAIN}\n"

## export the schema to the db2 database
printf "\n${RED}>> Create the database${PLAIN} ${GREEN}...${PLAIN}\n"
docker exec -it $DB2_CONTAINER su - $USER -c "db2 create db $DATABASE"
printf "\n${CYAN}Database created successfully.${PLAIN}\n"

## set env variables for running test
printf "\n${RED}>> Setting env variables to run test${PLAIN} ${GREEN}...${PLAIN}"
export DB2_HOSTNAME=$HOST
export DB2_PORTNUM=$PORT
export DB2_USERNAME=$USER
export DB2_PASSWORD=$PASSWORD
export DB2_DATABASE=$DATABASE
export DB2_SCHEMA=$SCHEMA
export CI=true
printf "\n${CYAN}Env variables set.${PLAIN}\n"

printf "\n${CYAN}Status: ${PLAIN}${GREEN}Set up completed successfully.${PLAIN}\n"
printf "\n${CYAN}To run the test suite:${PLAIN} ${YELLOW}npm test${PLAIN}\n\n"
