$(function(){
  function throwError(message){
     throw new Error(message);
  }
  Backbone._sync = Backbone.sync;
  Backbone.sync = function(method, model, options){
    var params = {action: method};
    if(!options.url){
      params.url = _.result(model, 'url') || throwError("Invalid URL")
    }
    if(options.data == null && model && (method === 'create' || method === 'update' ||  method === 'delete')){
      params.data = model;
    }
    params = _.extend(params, options);
    console.log(params)
    chrome.runtime.sendMessage(params, function(response){
      console.log("response")
      console.log(response)
      if(response.state){
        options.success(response.result);
      } else if(options.error){
        options.error(response);
      }
    });
    model.trigger('request', model, null, options)
  }

  // Job Model
  var Job = Backbone.Model.extend({
    url: function(){return _.extend({id: this.id}, _.result(this.collection, 'url', {}))}
  });
  var JobList = Backbone.Collection.extend({
    model: Job,
    url: {target: "jobs"}
  });
  var Jobs = new JobList;
  
  var JobView = Backbone.View.extend({
    tagName: "li",
    template: function(model) {
      var jobNameTag = '<span class="job-name">' + model.jobName + '</span>'
      var removeButton = '<span class="right-item glyphicon glyphicon-trash delete"></span>'
      var html = jobNameTag + removeButton;
      
      return html
    },
    events: {
      "click .delete": "clear"
    },
    initialize: function() {
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },
    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      this.$el.addClass("list-group-item");
      this.$el.addClass("has-right-item");
      return this;
    },
    clear: function() {
      this.model.destroy();
    }
  });
  
  var AppView = Backbone.View.extend({
    el: $("#jenkins-collection-app"),
    events: {
      "click .add": "create"
    },
    initialize: function() {
      this.$jenkinsUrl = this.$("#jenkins-url");
      this.$jobName = this.$("#job-name");
      this.listenTo(Jobs, 'add', this.addOne);
      this.listenTo(Jobs, 'reset', this.addAll);
      this.listenTo(Jobs, 'all', this.render);
      
      Jobs.fetch();
    },
    render: function() {
      if(Jobs.length){
        this.$("#empty-message").hide()
      } else {
        this.$("#empty-message").show()
      }
    },
    addOne: function(job) {
      var view = new JobView({model: job});
      this.$("#jenkins-job-list ul").append(view.render().el);
    },
    addAll: function() {
      Jobs.each(this.addOne, this);
    },
    create: function(){
      Jobs.create({jenkinsUrl: this.$jenkinsUrl.val(), jobName: this.$jobName.val()}, {wait: true});
      this.$jenkinsUrl.val('');
      this.$jobName.val('');
    }
  });
  var App = new AppView;
});
