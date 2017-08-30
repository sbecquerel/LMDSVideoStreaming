# La maison des sons - Video Streaming
## pm2 usage
`$ npm install pm2 -g`  
`$ pm2 start app.js`  
`$ pm2 start app.js --watch`  
`$ pm2 ls`  
`$ pm2 stop app`  
`$ pm2 monit`  
## Tests
| Action          | Command                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Authentify      | `$ curl --data "user=guitare&password=guitare" http://localhost:8080/auth`                             |
| Disconnect      | `$ curl --header "Authorization: Bearer PA4KHEEB" http://localhost:8080/logout`                        |
| Get video list  | `$ curl --header "Authorization: Bearer 98SN7UT1" http://localhost:8080/video`                         |
| Get video       | `$ curl --header "Authorization: Bearer 98SN7UT1" http://localhost:8080/video/42`                      |
| Set favorite    | `$ curl --header "Authorization: Bearer QJHXO9JY" --data "favorite=1" http://localhost:8080/video/440` |

## Install ffmpeg on ubuntu
```bash
sudo add-apt-repository ppa:mc3man/trusty-media
sudo apt-get update
sudo apt-get install ffmpeg
```
## Thumbnails generation
`$ npm run generate-thumbnails /var/www/storage/lmds/`  
`$ npm run generate-thumbnails /var/www/storage/lmds/ squared`
