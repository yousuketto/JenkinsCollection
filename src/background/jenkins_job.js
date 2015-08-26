var JOB_PREFIX = "job:"
function generateKey(jenkinsUrl, jobName){
  return JOB_PREFIX + JSON.stringify({jenkinsUrl, jobName});
}
function isJobKey(key){
  return key.substring(0, JOB_PREFIX.length) === JOB_PREFIX
}

import ChromeStorage from './chrome_storage';

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
          ChromeAlarm.create(job.id);
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
      ChromeAlarm.clear(key);
      delete JobCache[key];
      ChromeStorage.remove(key);
      resolve();
    });
  }
  noticeBuild(notifyTargets){
    if(notifyTargets.length != 0){
      var key = generateKey(this.jenkinsUrl, this.jobName)
      ChromeNotifications.clear(key + "0");
      ChromeNotifications.clear(key + "1");
      if(notifyTargets[1]){
        var target = notifyTargets[1];
        var message = {
          type: "basic",
          title: target.result || "Building",
          message: this.jobName + "  #" + target.number,
          iconUrl: target.iconUrl()
        };
        ChromeNotifications.create(key + "1", message);
      }
      if(notifyTargets[0]){
        var target = notifyTargets[0];
        var message = {
          type: "basic",
          title: target.result || "Building",
          message: this.jobName + "  #" + target.number,
          iconUrl: target.iconUrl()
        };
        ChromeNotifications.create(key+"0", message)
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

import ChromeNotifications from './chrome_notifications';
import ChromeAlarm from './chrome_alarm';

var JobCache = {};

import Utils from './utils';
import BuildStatus from './build_status';


export default JenkinsJob;