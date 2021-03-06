// TODO Error handling.
var JOB_PREFIX = "job:"
function generateKey(jenkinsUrl, jobName){
  return JOB_PREFIX + JSON.stringify({jenkinsUrl, jobName});
}
function isJobKey(key){
  return key.substring(0, JOB_PREFIX.length) === JOB_PREFIX
}

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

class JenkinsJob {
  constructor(jenkinsUrl, jobName){
    jenkinsUrl = jenkinsUrl.trim();
    jobName = jobName.trim();
    jenkinsUrl = jenkinsUrl.slice(-1) === "/" ? jenkinsUrl : jenkinsUrl + "/";

    this.id = generateKey(jenkinsUrl, jobName);
    this.jenkinsUrl = jenkinsUrl;
    this.jobName = jobName;
  }
  static add(jenkinsUrl, jobName) {
    var job = new this(jenkinsUrl, jobName);
    var item = {};
    item[job.id] = job;

    var throwConflict = function(){throw new Error("Conflict");};
    return this.find(job.id).then(throwConflict, function(){
      return new Promise(function(resolve, reject){
        var validResult = job.validate();
        if(validResult){
          reject(Error(JSON.stringify({validationResult: validResult})));
          return;
        }
        // TODO validation.
        // when fail, exec reject function.
        ChromeStorage.set(job.id, job).then(function(){
          chrome.alarms.create(job.id, {periodInMinutes: 1});
        });
        resolve(JobCache[job.key] = job);
      });
    });
  }
  validate(){
    var result = {}
    if(!this.jenkinsUrl || !this.jenkinsUrl.trim().length) {
      result.jenkinsUrl = result.jenkinsUrl || [];
      result.jenkinsUrl.push("Jenkins url is blank.");
    }
    if(this.jenkinsUrl && !/^https?:\/\//.test(this.jenkinsUrl)){
      result.jenkinsUrl = result.jenkinsUrl || [];
      result.jenkinsUrl.push("Jenkins url should be only URL format.");
    }

    if(!this.jobName || !this.jobName.trim().length) {
      result.jobName = result.jobName || [];
      result.jobName.push("Job Name is blank.");
    }

    if(this.jobName && this.jobName.indexOf("/") >= 0) {
      result.jobName = result.jobName || [];
      result.jobName.push("Job Name should not include '/'.");
    }

    return Object.keys(result).length ? result : null;
  }

  static find(key){
    var self = this;
    return new Promise(function(resolve, reject){
      if(JobCache[key]){
        resolve(JobCache[key]);
      }else{
        ChromeStorage.get(key).then(function(data){
          var job = new self(data.jenkinsUrl, data.jobName);
          JobCache[key] = job;
          resolve(job);
        }, function(error){
          reject(error);
        });
      }
    });
  }

  static all(){
    var self = this;
    // TODO should get from cache?
    return new Promise(function(resolve, reject){
      ChromeStorage.get().then((items) => {
        var jobs = [];
        for(var key in items){
          if(isJobKey(key)){
            var item = items[key];
            jobs.push(new self(item.jenkinsUrl, item.jobName));
          }
        }
        resolve(jobs);
      }, reject);
    });
  }
  static remove(key){
    return new Promise(function(resolve, reject){
      chrome.alarms.clear(key);
      delete JobCache[key];
      ChromeStorage.remove(key);
      resolve();
    });
  }
  noticeBuild(notifyTargets){
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
  pullStatus(){
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
  }
}
chrome.alarms.onAlarm.addListener(function(alarm){
  if(isJobKey(alarm.name)){
    JenkinsJob.find(alarm.name)
      .then(function(job){job.pullStatus();}).catch(Utils.log);
  }
});

var JobCache = {};

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

class BuildStatus {
  constructor(number, result){
    this.number = number;
    this.result = result;
  }

  static fromJenkinsResponse(json) {
    if(json){
      var number = json.number;
      var result = json.result;
      return new this(number, result);
    }else{
      return null;
    }
  }
  isEq(other) {
    return other &&
      this.number === other.number &&
      this.result === other.result;
  }
  isSuccess() {
    return this.result === "SUCCESS";
  }
  isFailure() {
    return this.result === "FAILURE";
  }
  iconUrl() {
    var color = this.isSuccess() ? "green" : (this.isFailure() ? "red" : "black");
    return `icons/${color}.png`;
  }
}

class JenkinsJobController {
  constructor(data){
    this.data = data || {};
  }
  read(){
    return JenkinsJob.all();
  }
  create(){
    return JenkinsJob.add(this.data.jenkinsUrl, this.data.jobName);
  }
  destroy(){
    return JenkinsJob.remove(this.data.id);
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  var controller = new JenkinsJobController(request.data);
  var action_name = request.action == "delete" ? "destroy" : request.action;
  if(controller[action_name]) {
    var succeed = function(result){sendResponse({state: true, result: result})}
    var fail = function(){sendResponse({state: false, result: arguments})}
    new Promise(function(resolve, reject){
      resolve(controller[action_name]());
    }).then(succeed, fail);
    return true
  } else {
    sendResponse({state: false, result: [`Not found action.[${action_name}]`]})
    return false
  }
})
