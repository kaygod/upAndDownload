const fs = require("fs");
const path = require("path");

Buffer.prototype.split = Buffer.prototype.split || function (spl) {
  let arr = [];
  let cur = 0;
  let n = 0;
  while ((n = this.indexOf(spl, cur)) != -1) {
    arr.push(this.slice(cur, n));
    cur = n + spl.length
  }
  arr.push(this.slice(cur))
  return arr
}


const getHtml = () => {

  return fs.createReadStream(path.join(__dirname, "index.html"));

}

const fileHandler = (str, buffers, req) => {

  let boundary = '--' + str.split('=')[1];

  //第一步使用boundary切割,形式类似于------WebKitFormBoundary8QtZlZVe7Tqym8tG

  let result = buffers.split(boundary);

  //第二步丢弃首部的空元素和尾部的--元素

  result.shift();
  result.pop();

  /**
   * 第三步现在只剩下两种形式
   * 
   * \r\n数据描述\r\n\r\n数据值\r\n 和 \r\n数据描述1\r\n数据描述2\r\n\r\n文件内容\r\n
   * 
   */
  result = result.map(buffer => buffer.slice(2, buffer.length - 2))

  /**
   * 第四步 现在只剩下两种数据形式
   * 
   * 数据描述\r\n\r\n数据值 和 数据描述1\r\n数据描述2\r\n\r\n文件内容
   * 
   * 继续使用\r\n\r\n进行切割
   */

  result = result.map((buffer) => {
    return buffer.split("\r\n\r\n");
  })

  /**
   * 第五步要组合数据了
   * 
   */
  let obj = {};

  result.forEach((array) => {

    /**
     *   普通表单数据格式
     *   Content-Disposition: form-data; name="type_id"
     *   1 
     */
    if (array[0].indexOf("\r\n") == -1) { //普通表单数据

      const arr = array[0].toString().split(";");

      let key = arr[arr.length - 1].split("=")[1].toString();

      key = key.replace(/['"]/ig, "");

      obj[key] = array[1].toString();

    } else {//文件数据
      /**
       Content-Disposition: form-data; name="photo"; filename="854138674122619089.jpg"
       Content-Type: image/jpeg

       xxxxxxxxxxxxxx一堆二进制数据
     */
      const fileData = array[1]; //承载二进制的文件数据
      const arr = array[0].split("\r\n")[0].split(";");
      let filename = arr[arr.length - 1].split("=")[1].toString();
      filename = filename.replace(/['"]/ig, "");
      const filePath = `/upload/${filename}`;

      //现在要开始写文件了
      fs.writeFile(path.join(__dirname, filePath), fileData, (err) => {
        console.log(err);
      })

      obj.fileUrl = filePath;


    }

  })

  return obj;

}

/**
 * 获取post过来的数据
 */
const getPostData = (req) => {

  return new Promise((resolve) => {

    let chunk = [];

    req.on("data", (buffer) => {
      chunk.push(buffer);
    })

    req.on("end", () => {

      const buffers = Buffer.concat(chunk);

      let boundary = req.headers['content-type'].split('; ')[1]; //获取boundary分隔符,上传文件的时候在req的Content-Type中会带这个参数

      if (boundary && boundary.includes("boundary")) { //触发文件下载
        boundary = fileHandler(boundary, buffers, req); //将文件上传解析完毕的参数赋值给boundary
      } else {
        boundary = null;
      }

      if (boundary) { //文件上传

        resolve(boundary);

      } else { //普通post请求

        let data = buffers.toString();

        resolve(data);

      }


    })

  })

}

/**
 * 下载文件
 */
const downloadFile = (pathUrl, res) => {

  const readStream = fs.createReadStream(pathUrl);

  const stats = fs.statSync(pathUrl);

  const filename = path.basename(pathUrl);

  res.writeHead(200, {
    'Content-Type': 'application/octet-stream', //告诉浏览器这是一个二进制文件
    'Content-Disposition': 'attachment; filename=' + filename, //告诉浏览器这是一个需要下载的文件
    'Content-Length': stats.size
  });

  readStream.pipe(res);

}

module.exports = {
  getHtml,
  getPostData,
  downloadFile
}