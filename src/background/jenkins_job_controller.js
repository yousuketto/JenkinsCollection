import JenkinsJob from './jenkins_job';

export default class JenkinsJobController {
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
