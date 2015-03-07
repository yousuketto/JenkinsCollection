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
    url: function(){return _.extend({id: this.id}, _.result(this.collection, 'url', {}))},
    validate: function(attrs, options){
      var result = {}
      if(!attrs.jenkinsUrl || !attrs.jenkinsUrl.trim().length) {
        result.jenkinsUrl = result.jenkinsUrl || [];
        result.jenkinsUrl.push("Jenkins url is blank.");
      }
      if(attrs.jenkinsUrl && !/^https?:\/\//.test(attrs.jenkinsUrl)){
        result.jenkinsUrl = result.jenkinsUrl || [];
        result.jenkinsUrl.push("Jenkins url should be only URL format.");
      }

      if(!attrs.jobName || !attrs.jobName.trim().length) {
        result.jobName = result.jobName || [];
        result.jobName.push("Job Name is blank.");
      }

      if(attrs.jobName && attrs.jobName.indexOf("/") >= 0) {
        result.jobName = result.jobName || [];
        result.jobName.push("Job Name should not include '/'.");
      }

      return Object.keys(result).length ? result : null;
    }
  });
  var JobList = Backbone.Collection.extend({
    model: Job,
    url: {target: "jobs"}
  });
  var Jobs = new JobList;
  
  var JobView = Backbone.View.extend({
    tagName: "li",
    template: function(model) {
      var url = model.jenkinsUrl + "job/" + model.jobName
      var jenkinsUrlTag = '<span class="jenkins-url">' + model.jenkinsUrl + '</span>'
      var withUrlJobName = '<a target="_blank" href="' + url + '">' + model.jobName + '</a>'
      var jobNameTag = '<span class="job-name">' + withUrlJobName + '</span>'
      var removeButton = '<span class="right-item glyphicon glyphicon-trash delete"></span>'
      var html = jenkinsUrlTag + jobNameTag + removeButton;
      
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

  var CreateForm = Backbone.View.extend({
    el: $("#create-form"),
    events: {
      "keypress input": "createOnEnter",
      "click .open-btn": "open",
      "click .close-btn": "close"
    },
    initialize: function() {
      this.$jenkinsUrl = this.$("#jenkins-url");
      this.$jobName = this.$("#job-name");
      this.$messageField = this.$("#validation-message");
      this.$fields = this.$(".form-inline");
    },
    createOnEnter: function(e){if (e.keyCode == 13) this.create();},
    create: function(){
      var model = Jobs.create({
        jenkinsUrl: this.$jenkinsUrl.val(),
        jobName: this.$jobName.val()
      }, {wait: true});

      var ul = this.$messageField.find("ul");
      this.$messageField.hide();
      ul.html('');

      if(model.validationError) {
        var messages = _.flatten(_.values(model.validationError));
        messages = messages.map(function(message){return $("<li>" + message + "</li>")});
        _.each(messages, function(message){ul.append(message)})
        this.$messageField.show();
      } else {
        this.$jenkinsUrl.val('');
        this.$jobName.val('');
      }
    },
    open: function(){
      this.$el.removeClass("closed");
      this.$el.addClass("opened");
      this.$fields.show(300);
    },
    close: function(){
      this.$el.removeClass("opened");
      this.$el.addClass("closed");
      this.$fields.hide(300);
    }
  });

  var AppView = Backbone.View.extend({
    el: $("#jenkins-collection-app"),
    initialize: function() {
      this.listenTo(Jobs, 'add', this.addOne);
      this.listenTo(Jobs, 'reset', this.addAll);
      this.listenTo(Jobs, 'all', this.render);
      this.createForm = new CreateForm;
      
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
  });
  var App = new AppView;
});
