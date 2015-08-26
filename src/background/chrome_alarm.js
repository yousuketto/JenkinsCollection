var ChromeAlarm = {
  create(job_id){
    chrome.alarms.create(job_id, {periodInMinutes: 1});
  },
  clear(job_id){
    chrome.alarms.clear(key);
  },
  addListener(func){
    chrome.alarms.onAlarm.addListener(func);
  }
}

export default ChromeAlarm;
