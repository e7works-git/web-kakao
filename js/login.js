// const BASE_URL = location.host == 'dev.vchatcloud.com' ? 'https://dev.vchatcloud.com' : 'https://vchatcloud.com';
const { RoomInit, Trans, FileUtil, OpenGraph, Util } = e7lib;
const BASE_URL = Util.Config.hostpath;
console.log("BASE_URL", BASE_URL);
let vChatCloud, channel, userNick, userKey, channelKey, youtubeId, youtubeList, subChannel, res, roomInfo, pw, email;
const lock = { pw: false, email: false };

$(function () {
  // 리소스 로드
  res_load();

  // params
  channelKey = res.getParameters("channelKey");
  // console.log("channelKey", channelKey)
  youtubeId = res.getParameters("youtubeId");
  // console.log("youtubeId", youtubeId)
  youtubeList = res.getParameters("youtubeList");
  // console.log("youtubeList", youtubeList)
  try {
    email = Util.dataEmailPaser(res.getParameters("data"));
  } catch (e) {
    email = ""
  }
  
  // console.log("email", email)
  res.init(); // 기본이벤트
  res.profileInit(); // 프로필 로드
  roomInfo = res.roomInfoLoad(channelKey, (roomData) => {
    vChatCloud = new VChatCloud({
      url: Util.Config.chatUrl,
    });
    if (roomData.lock() === "Y") {
      switch (roomData.lockType()) {
        case "PW":
          lock.pw = true;
          break;
        case "EM":
          lock.email = true;
          break;
        case "ALL":
          lock.pw = true;
          lock.email = true;
          break;
      }
    }
  });

  if (youtubeList) {
    youtubeList = "list=" + youtubeList;
  } else {
    youtubeList = "playlist=" + youtubeId;
  }

  // login
  res.loginShow();

  $("#name").on("keyup", function (e) {
    if (e.keyCode == 13) {
      res.loginBtn.trigger("click");
    }
  });

  res.loginBtn.off("click").click(async function () {
    let nickName = res.nick.val();
    if (nickName) {
      let joined = false;
      const entryDiv = $("#entry");
      while (!joined) {
        await new Promise((resolve, reject) => {
          if (lock.pw || lock.email) {
            entryDiv.css("display", "flex");
            $(".entry_form").hide();
            if (lock.pw) {
              $(".entry_form.pw").show();
            }
            if (lock.email && !email) {
              $(".entry_form.id").show();
            } else {
              resolve(true);
            }

            $(".entry_btnwrap .submit", entryDiv).on("click", () => {
              pw = $(".entry_form.pw input").val();
              if (!email) {
                email = $(".entry_form.id input").val();
              }
              resolve(true);
            });
            $(".entry_btnwrap .cancel", entryDiv).on("click", () => {
              entryDiv.css("display", "none");
              $(".entry_form.pw input").val("");
              $(".entry_form.id input").val("");
              reject(false);
            });
            $(".entry_form input").on("keypress", (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                $(".entry_btnwrap .submit", entryDiv).trigger("click");
              }
            });
          } else {
            resolve(true);
          }
        }).then(
          async () =>
            await new Promise((resolve) => {
              res.joinRoom(
                {
                  roomId: channelKey,
                  clientKey: email ?? res.clientKey,
                  nickName,
                  ...(lock.pw && pw ? { password: pw } : {}),
                },
                function (err, history) {
                  if (err) {
                    console.log(err);
                    // 미허용 회원ID/비밀번호
                    if (err.code === 10114 || err.code === 10115) {
                      pw = "";
                      if (err.code === 10114) {
                        email = "";
                        $(".entry_form.id").show();
                      }
                      $(".entry_contents_subtitle").show();
                      res.loginShow();
                      res.roomInitTagRemove();
                      vChatCloud.disconnect();
                    } else {
                      openError(err.code, function () {
                        res.loginShow();
                        res.roomInitTagRemove();
                        vChatCloud.disconnect();
                      });
                    }
                  } else {
                    // 채팅영역에 글쓰기가 활성화될시 활성화(최신공지 한개만 남기기)
                    let noticeMsgCnt = 0;
                    if (typeof write == "function")
                      history &&
                        history.forEach(function (m) {
                          if (m.messageType == "notice") {
                            if (noticeMsgCnt == 0) {
                              noticeMsgCnt++;
                              write(m, "notice", true);
                            }
                          } else if (m.mimeType == "file") {
                            fileWrite(m, true);
                          } else {
                            if (m.grade == "userManager") {
                              write(m, "userManager", true);
                            } else {
                              write(m, "", true);
                            }
                          }
                        });
                    $(".entry_contents_subtitle").hide();
                    entryDiv.css("display", "none");
                    joined = true;
                    res.chatShow();
                    // 이벤트 바인딩 시작
                    chatInit();
                    // 채팅영역에 글쓰기가 활성화될시 활성화
                    if (typeof write == "function") write(res.initMsg, "join");
                  }
                  resolve();
                }
              );
            })
        );
      }
    }
  });

  res.exitBtn.off("click").click(function () {
    if (res.drawer.is(":visible")) {
      res.drawerClose();
    }
    if ($(".kakao .use_help").is(":visible")) {
      $(".use_help").hide();
    }
    res.roomInitTagRemove();
    setTimeout(() => {
      res.loginShow();
    }, 1);
    res.emoTabInit();
    vChatCloud.disconnect();
  });
});

// 리소스 로드
let res_load = function () {
  // resource
  res = {
    // init
    init: function () {
      // destroy channel
      window.addEventListener("beforeunload", function (e) {
        if (creatorFlag) {
          this.sendCustomMsg({
            openRoomId: openRoomId,
            type: "subOut",
            clientKey: channel.clientKey,
          });
          channelClose(openRoomId, function () {});
        }
      });
      window.addEventListener("unload", function () {
        if (creatorFlag) {
          this.sendCustomMsg({
            openRoomId: openRoomId,
            type: "subOut",
            clientKey: channel.clientKey,
          });
          channelClose(openRoomId, function () {});
        }
      });

      // 팝업 외 마우스 클릭 시 팝업 닫힘
      $(document).mouseup(function (e) {
        let popupLayer = $(".popupLayer");
        let chat_input = $(".talk_input");
        let contextmenu = $("#contextmenu");
        if (chat_input.has(e.target).length === 0) {
          // $(".ico_keyboard").trigger('click')
        }
        if ($(e.target).attr("id") != "contextmenu" && $(e.target).parents("#contextmenu").length == 0) {
          contextmenu.remove();
        }
      });

      // toast popup
      toastr.options = {
        positionClass: "toast-top-left",
        // "progressBar": true,
        timeOut: 5000,
        onclick: function () {
          // res.directClipboardCopy(private_room.password);
        },
      };
    },
    login: $("div.login"), // p
    chat: $("div.talk_field"), // c
    // login
    loginShow: function () {
      this.chat.hide();
      this.login.show();
    },
    // chat
    chatShow: function () {
      this.login.hide();
      this.chat.show();
    },
    // close drawer
    drawer: $(".kakao .gather-file-wrap"),
    drawerTop: $(".kakao .gather-file-wrap .file-menu"),
    drawerClose: function () {
      if ($(".kakao .gather-file-wrap .file-menu").first().hasClass("on")) {
        this.drawer.toggle();
      } else {
        this.drawer.toggle();
        this.drawerTop.first().trigger("click");
      }
    },
    // emoticon tab init
    emoTabInit: function () {
      $("div.emoji-wrap").hide();
      $("div.emoji-subwrap").removeClass("current");
      $("#tab-1").addClass("current");
      $("li.tab-link").removeClass("current");
      $("ul.emoji-tab-wrap li:first").addClass("current");
      $(".ico_emoji").addClass("show");
      $(".ico_keyboard").removeClass("show");
    },
    nick: $("input#name", this.login),
    // nickTag: $('div.bottom div.name'),
    clientKey: "xxxxxxxx".replace(/[xy]/g, function (a, b) {
      return (b = Math.random() * 16), (a == "y" ? (b & 3) | 8 : b | 0).toString(16);
    }),
    initMsg: "vChatCloud 오픈채팅방에 입장하셨습니다.",
    loginBtn: $("button.popupbtn", this.login),
    exitBtn: $("a#closebtn"),
    // 채팅정보 삭제
    roomInitTagRemove: function (sub) {
      $(".talk_contents").scrollTop(0);
      setTimeout(() => {
        $(
          ".entery, .opponent, .user, .notice, .whisper, .userManager, .content, .join, .html, .contents",
          $(".content1")
        ).remove();
      }, 1);
      // chatHeightEdit()
    },
    profileList: $("#lista1 > div > div > li.als-item"),
    profile: "1",
    // 프로필 생성
    profileTagInit: function () {
      for (var i = 1; i < 49; i++) {
        let profile = $(
          `<li class="als-item" data-profile-no="${i}"><a><p profile="${i}" class="profile-${i}" href="#"></p></a></li>`
        );
        $("div.als-viewport div.als-wrapper").append(profile);
        if (i == 1) {
          profile.addClass("active");
        }
      }
      this.profileList = $("#lista1 > div > div > li.als-item");
    },
    // 프로필 이벤트
    profileTagEventInit: function () {
      res.profileList.off("click").click(function () {
        res.profileList.removeClass("active");
        $(this).addClass("active");
        res.profile = $(this).attr("data-profile-no");
      });
    },
    // 좌우 스크롤
    alsInit: function (tag, option) {
      $(tag).als(option);
    },
    // 프로필정보 로드
    profileInit: async function () {
      await this.profileTagInit();
      await this.profileTagEventInit();
      await this.alsInit("#lista1", {
        visible_items: 4,
        scrolling_items: 4,
        orientation: "horizontal",
        circular: "no",
        autoscroll: "no",
        speed: 300,
      });
    },
    // mainProfileInit: function () {
    //     $('div.chat_input .profile_img #chat_icon_input').remove('img')
    //     let profileImg = 'profile-' + this.profile
    //     $('div.chat_input .profile_img').addClass(`${profileImg}`)
    // },

    // 룸정보 로드
    roomInfoLoad(key, callback) {
      return new RoomInit(key, callback);
    },
    // 룸 접속
    joinRoom: function ({ roomId, clientKey, nickName, password, email }, callback) {
      // vchatcloud 객체
      channel = vChatCloud.joinChannel(
        {
          roomId: roomId,
          clientKey: clientKey,
          nickName: nickName,
          userInfo: {
            profile: res.profile,
          },
          ...(lock.pw && pw ? { password } : {}),
        },
        function (error, history) {
          if (error) {
            res.roomInitTagRemove();
            if (callback) return callback(error, null);
            return error;
          }
          if (callback) callback(null, history);
        }
      );
    },
    getParameters: function (paramName) {
      // 리턴값을 위한 변수 선언
      let returnValue;
      // 현재 URL 가져오기
      let url = location.search;
      // get 파라미터 값을 가져올 수 있는 ? 를 기점으로 slice 한 후 split 으로 나눔
      let parameters = url.slice(1).split("&");
      console.log("parameters", parameters);
      // 나누어진 값의 비교를 통해 paramName 으로 요청된 데이터의 값만 return
      for (let i = 0; i < parameters.length; i++) {
        let varName = parameters[i].split("=")[0];
        if (varName.toUpperCase() == paramName.toUpperCase()) {
          returnValue = parameters[i].split("=")[1];
          return decodeURIComponent(returnValue);
        }
      }
    },
  };
};

function openError(code, callback) {
  let p = $("div.errorpopup").hide();
  if (errMsg[code] == undefined) {
    $("p:nth-child(2)", p).text(code);
  } else {
    $("p:nth-child(2)", p).text(errMsg[code].kor);
  }
  $("a", p)
    .off()
    .click(function () {
      p.hide();
      if (typeof callback == "function") {
        callback();
      }
    });
  p.show();
}

// 채팅방 제목 (채팅방 입장시 제목 변경)
function getRoomInfo() {
  const api_url = `${BASE_URL}openapi/getChatRoomInfo`;
  let param = {
    room_id: channelKey,
  };
  $.post(
    api_url,
    param,
    function (data) {
      if (data.result_cd == 1) {
        $("#roomNm").append(data.param.room_nm);
      } else {
        console.log("조회 실패");
      }
    },
    "json"
  );
}
