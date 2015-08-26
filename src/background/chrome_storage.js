var ChromeStorage = {
  get(key){
    if(key){
      return new Promise(function(resolve, reject){
        chrome.storage.local.get(key, function(item){
          if(Object.keys(item).length != 0) {
            resolve(item[key]);
          } else {
            reject(Error("NOT FOUND"));
          }
        })
      });
    } else {
      return new Promise(function(resolve, reject){
        chrome.storage.local.get(function(items){resolve(items)});
      });
    }
  },
  set(key, obj){
    return new Promise(function(resolve, reject){
      chrome.storage.local.set({[key]: obj}, function(){
        resolve();
      });
    })
  },
  remove(key){
    return new Promise(function(resolve, reject){
      chrome.storage.local.remove(key);
      resolve();
    });
  }
}

export default ChromeStorage;
