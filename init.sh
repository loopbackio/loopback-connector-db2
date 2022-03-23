#/bin/bash

echo "******************************************************************************"
echo "* WARNING: This will destroy existing Db2wh data and create a new container. *"
echo "* Press Crl-C now to abort!!!                                                *"
echo "* Starting in 10 seconds...                                                  *"
echo "******************************************************************************"
echo

sleep 10

docker rm -f Db2whCE
rm -rf /mnt/clusterfs/*

systemctl restart docker
systemctl restart network

# dremond@ca.ibm.com, on Nov 22, 2019, pulled down this docker image: 'docker pull store/ibmcorp/db2wh_ce:v11.5.1.0-db2wh_devc-linux'
# because the previous docker image we were using was for enterprise edition and the trial license ran out.

docker run -d -it --privileged=true --net=host --name=Db2whCE -v /mnt/clusterfs:/mnt/bludata0 -v /mnt/clusterfs:/mnt/blumeta0 store/ibmcorp/db2wh_ce:v11.5.1.0-db2wh_devc-linux

# if the container is deleted and then recreated, it is possible that some loopback-connector-dashdb tests may start failing with regards to
# referential integrity. In this case, open a shell into the container. Switch to bluadmin. 
# Execute the command: db2 update db cfg for BLUDB using DDL_CONSTRAINT_DEF YES immediate 
# stop the container. start the container.
# run the loopback-connector-db tests again, and all tests should pass.
  

docker logs --follow Db2whCE