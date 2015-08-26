export default class BuildStatus {
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
