// TODO Error handling.
import ChromeAlarm from './background/chrome_alarm';
import JenkinsJob from './background/jenkins_job';
import Utils from './background/utils'

ChromeAlarm.addListener(function(alarm){
  JenkinsJob.find(alarm.name).then(function(job){job.pullStatus();}).catch(Utils.log);
});

import JenkinsJobController from './background/jenkins_job_controller';

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
