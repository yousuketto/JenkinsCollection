var Utils = {
  log(){
    Array.prototype.slice.call(arguments).forEach(function(_){console.log(_)});
  },
  Xhr: {
    get(url){
      return new Promise(function(resolve, reject){
        var req = new XMLHttpRequest();
        req.open("GET", url);
        req.onload = function(){
          if(req.status == 200){
            resolve(req.response);
          } else {
            reject(Error(req.statusText));
          }
        }
        req.onerror = function(){
          reject(Error("Network Error"));
        }
        req.send();
      });
    }
  }
}
export default Utils;
