// TODO Error handling.
var JenkinsJob = (function(){
  var JOB_PREFIX = "job:"
  function generateKey(jenkinsUrl, jobName){
    return JOB_PREFIX + JSON.stringify({jenkinsUrl: jenkinsUrl, jobName: jobName});
  }
  function parseKey(key){
    if(isJobKey(key)){
      return JSON.parse(key.substring(JOB_PREFIX.length));
    }
  }
  function isJobKey(key){
    return key.substring(0, JOB_PREFIX.length) === JOB_PREFIX
  }

  var klass = function JenkinsJob(jenkinsUrl, jobName){
    this.id = generateKey(jenkinsUrl, jobName);
    this.jenkinsUrl = jenkinsUrl;
    this.jobName = jobName;
  };
  chrome.alarms.onAlarm.addListener(function(alarm){
    if(isJobKey(alarm.name)){
      var searchOption = parseKey(alarm.name);
      JenkinsJob.find(searchOption.jenkinsUrl, searchOption.jobName)
        .then(function(job){job.pullStatus();}).catch(Utils.log);
    }
  });

  var JobCache = {};

  klass.add = function(jenkinsUrl, jobName){
    var jobInfo = {jenkinsUrl: jenkinsUrl, jobName: jobName};
    var key = generateKey(jenkinsUrl, jobName)
    var item = {};
    item[key] = jobInfo;
    // TODO validation.

    chrome.storage.local.set(item, function(){
      chrome.alarms.create(key, {periodInMinutes: 1});
    });
    JobCache[key] = new this(jenkinsUrl, jobName);
  }
  
  klass.find = function(jenkinsUrl, jobName){
    var self = this;
    var key = generateKey(jenkinsUrl, jobName);
    return new Promise(function(resolve, reject){
      if(JobCache[key]){
        resolve(JobCache[key]);
      }else{
        chrome.storage.local.get(key, function(item){
          if(Object.keys(item).length != 0){
            var data = item[key];
            var job = new self(data.jenkinsUrl, data.jobName);
            JobCache[key] = job;
            resolve(job);
          } else {
            reject(Error("NOT FOUND"))
          }
        });
      }
    });
  };
  klass.all = function(callback){
    var self = this;
    // TODO should get from cache?
    chrome.storage.local.get(function(items){
      var jobs = []
      for(var key in items){
        if(isJobKey(key)){
          var item = items[key];
          jobs.push(new self(item.jenkinsUrl, item.jobName));
        }
      }
      callback(jobs);
    });
  };

  klass.remove = function(jenkinsUrl, jobName){
    var key = generateKey(jenkinsUrl, jobName);
    chrome.alarms.clear(key);
    delete JobCache[key];
    chrome.storage.local.remove(key);
  };

  function BuildStatus(number, result){
    this.number = number;
    this.result = result;
  }
  BuildStatus.prototype.isEq = function(other){
    return other && this.number === other.number && this.result === other.result;
  };
  BuildStatus.fromJenkinsResponse = function(json) {
    if(json){
      var number = json.number;
      var result = json.result;
      return new this(number, result);
    }else{
      return null;
    }
  };
  BuildStatus.prototype.iconUrl = function(){
    switch(this.result){
      case "SUCCESS":
        return "icons/green.png";
      case "FAILURE":
        return "icons/red.png";
      default:
        return "icons/black.png";
    }
  }

  klass.prototype.noticeBuild = function(notifyTargets){
    if(notifyTargets.length != 0){
      var key = generateKey(this.jenkinsUrl, this.jobName)
      chrome.notifications.clear(key+"0", function(){})
      chrome.notifications.clear(key+"1", function(){})
      if(notifyTargets[1]){
        var target = notifyTargets[1];
        var message = {
          type: "basic",
          title: target.result || "Building",
          message: this.jobName + "  #" + target.number,
          iconUrl: target.iconUrl()
        };
        chrome.notifications.create(key+"1", message, function(){})
      }
      if(notifyTargets[0]){
        var target = notifyTargets[0];
        var message = {
          type: "basic",
          title: target.result || "Building",
          message: this.jobName + "  #" + target.number,
          iconUrl: target.iconUrl()
        };
        chrome.notifications.create(key+"0", message, function(){})
      }
    }
  }
  klass.prototype.pullStatus = function(){
    var buildFields = "[number,result]"
    var queryValue = "tree=lastBuild" + buildFields + ",lastCompletedBuild" + buildFields;
    var apiUrl = this.jenkinsUrl + "job/" + this.jobName + "/api/json?" + queryValue;
    var self = this;
    var success_callback = function(json){
      var oldLastBuild = self.lastBuild;
      var lastBuild = self.lastBuild = BuildStatus.fromJenkinsResponse(json.lastBuild);
      var oldLastCompletedBuild = self.lastCompletedBuild;
      var lastCompletedBuild = self.lastCompletedBuild = BuildStatus.fromJenkinsResponse(json.lastCompletedBuild);

      var notifyTargets = []
      if(lastBuild && !lastBuild.isEq(oldLastBuild)) {
        notifyTargets.push(lastBuild);
        
        if(lastCompletedBuild && !lastBuild.isEq(lastCompletedBuild) && !lastCompletedBuild.isEq(oldLastCompletedBuild)){
          notifyTargets.push(lastCompletedBuild);
        }
      }
      self.noticeBuild(notifyTargets);
    }
    Utils.Xhr.get(apiUrl).then(JSON.parse, Utils.log).then(success_callback);
  };
  
  var Utils = {}
  Utils.log = function(){
    Array.prototype.slice.call(arguments).forEach(function(_){console.log(_)});
  }
  Utils.Xhr = {}
  Utils.Xhr.get = function(url){
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
  
  return klass;
})();