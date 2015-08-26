var assert = require('assert');
import BuildStatus from "../../src/background/build_status"

describe(BuildStatus.name, function(){
  describe(".fromJenkinsResponse", function(){
    context("when  aruguments isn't null", function(){
      it("returned BuildStatus's instance.", function(){
        var result = BuildStatus.fromJenkinsResponse({number: "1", result: "SUCCESS"});
        assert.equal(result.constructor, BuildStatus);
      });
    });
    context("when arugments is null", function(){
      it("returned null", function(){
        var result  = BuildStatus.fromJenkinsResponse(null);
        assert.equal(result, null);
      });
    });
  });

  describe("#isEq(other)", function(){
    var self = undefined;
    beforeEach(function(){
      self = new BuildStatus("test-number", "test-result");
    });
    context("when other.number isn't equal self.number", function(){
      it("return false.", function(){
        var other = new BuildStatus("other-number", "test-result");
        assert(self.isEq(other) === false);
      });
    });
    context("when other.number is equal self.number", function(){
      context("and other.result isn't equal self.result", function(){
        it("return false.", function(){
          var other = new BuildStatus("test-number", "other-result");
          assert(self.isEq(other) === false);
        });
      });
      context("and other.result is equal self.result", function(){
        it("return true.", function(){
          var other = new BuildStatus("test-number", "test-result");
          assert(self.isEq(other));
        });
      });
    });
  });

  describe("#isSuccess()", function(){
    context("when result is 'SUCCESS'", function(){
      it("return true", function(){
        assert(new BuildStatus("test-number", "SUCCESS").isSuccess());
      });
    });
    context("when result is 'FAILURE'", function(){
      it("return false", function(){
        assert(new BuildStatus("test-number", "FAILURE").isSuccess() === false);
      });
    });
    context("when result isn't 'FAILURE' and result isn't 'SUCCESS'", function(){
      it("return false", function(){
        assert(new BuildStatus("test-number", "other").isSuccess() === false);
      });
    });
  });

  describe("#isFailure()", function(){
    context("when result is 'SUCCESS'", function(){
      it("return false", function(){
        assert(new BuildStatus("test-number", "SUCCESS").isFailure() === false);
      });
    });
    context("when result is 'FAILURE'", function(){
      it("return true", function(){
        assert(new BuildStatus("test-number", "FAILURE").isFailure());
      });
    });
    context("when result isn't 'FAILURE' and result isn't 'SUCCESS'", function(){
      it("return false", function(){
        assert(new BuildStatus("test-number", "other").isFailure() === false);
      });
    });
  });

  describe("#iconUrl()", function(){
    context("when result is 'SUCCESS'", function(){
      it("return green icon path.", function(){
        assert.equal(new BuildStatus("test-number", "SUCCESS").iconUrl(), "icons/green.png")
      });
    });
    context("when result is 'FAILURE'", function(){
      it("return red icon path.", function(){
        assert.equal(new BuildStatus("test-number", "FAILURE").iconUrl(), "icons/red.png")
      });
    });
    context("when result is other state", function(){
      it("return black icon path.", function(){
        assert.equal(new BuildStatus("test-number", "other").iconUrl(), "icons/black.png")
      });
    });
  });
});
