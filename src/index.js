const http = require("http");
const path = require("path");
const querystring = require("querystring");

const { getHtml, getPostData, downloadFile } = require("./util");

const server = http.createServer((req, res) => {

  const { method, url } = req;

  if (method === "GET" && url === "/") {//返回html

    res.writeHead(200, { "Content-Type": "text/html;charset=UTF-8" });

    getHtml().pipe(res);

  } else if (method === "POST" && url === "/download") { //下载

    getPostData(req).then((params) => {

      if (params && querystring.parse(params).type_id == 1) {
        const filePath = path.join(__dirname, "1.txt");
        downloadFile(filePath, res);
      }

    })

  } else if (method === "POST" && url === "/upload") { //上传

    getPostData(req).then((params) => {

      console.log(params);

      res.end(JSON.stringify(params));

    })

  } else if (method === "POST" && url === "/post_data") { //普通post请求

    getPostData(req).then((params) => {

      console.log(params);

      res.end(JSON.stringify(params));

    })

  }

})

server.listen(8000);