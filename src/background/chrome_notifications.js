var ChromeNotifications = {
  clear(key){
    chrome.notifications.clear(key, function(){})
  },
  create(key, message){
    chrome.notifications.create(key, message, function(){});
  }
};

export default ChromeNotifications;
