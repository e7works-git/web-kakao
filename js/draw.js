let user_list = [],
    user_info = {},
    chat_bottom,
    setTid,
    animate,
    sub_user_list = [],
    sub_user_info = {},
    sub_chat_bottom,
    openGraph,
    fileUtil,
    trans,
    pre;

$(function () {

    // 채팅 쌓이는 최대 수 ( 나머지는 최근순으로 삭제 )
    chatLimit = 200;

    // 이모지 로딩
    emojiInit()

    /**
      * 번역기능 사용
      * targetTag: 번역할 태그 (해당 엘리먼트 우클릭 시 번역 창 보임)
      * trans: 번역 가능한 언어 목록
      * roomId: 채널 키 값
      * err: toaster.err 객체
      */
    trans = new Trans({
        targetSelector: '.opponent_text_balloon',
        trans: ['ko', 'en', 'de', 'vi', 'es', 'fr', 'pt', 'tr', 'ar', 'it', 'id', 'ja', 'zh-CN', 'zh-TW', 'tl', 'th', 'hi', 'ru'],
        roomId: channelKey,
        err: toastr.error,
    });

    // 오픈그래픽 표현 (링크 미리보기)
    openGraph = new OpenGraph();

    /**
   * 파일 업/다운로드 기능
   * isPrivate: 서브챗(비밀 채팅방)일 때 true / 아니면 false 혹은 값을 주지 않는다.
   * roomId: 채널 키
   * privateRoomId: 서브챗(비밀 채팅방)일 때만 사용, 프라이빗 룸의 채널 키를 받을 수 있는 함수를 건내준다.
   * uploadTag: 클릭 시 업로드 창을 띄울 태그
   * updateEvent: 업로드 시 사용할 콜백 함수
   * uploadDragTag: 해당 태그에 드래그 시 파일이 업로드 됨
   * progressTag: 프로그래스를 보여줄 태그
   * progressSize: 프로그래스의 크기
   * progressEvent: 업로드가 진행될 때 사용할 콜백 함수
   */
    fileUtil = new FileUtil({
        roomId: channelKey,
        uploadTag: 'div.file',
        updateEvent: fileUpdate,
        uploadDragTag: '.talk_contents',
        progressTag: '.talk_contents',
        progressSize: 60,
        progressEvent: function () {
            chatHeight(false, true);
        },
    });

    // 스크롤 감지
    $('div.talk_contents')
        .off('scroll')
        .scroll(function () {
            var scrollTop = $(this).scrollTop();
            var innerHeight = $(this).innerHeight();
            var scrollHeight = $(this).prop('scrollHeight');

            clearTimeout(setTid);
            if (Math.ceil(scrollTop) + innerHeight >= scrollHeight) {
                chat_bottom = true;
                $('.chat_scroll').hide();
            } else {
                chat_bottom = false;
                setTid = setTimeout(() => {
                    $('.chat_scroll').show();
                }, 100);
            }
        });

    // 스크롤 최하단 이동 이벤트
    $('.chat_scroll')
        .off('click')
        .click(function () {
            scrollBotton();
        });

    // 이모지 버튼
    $('div.emoji a').click(function () {
        channel.sendMessage({
            message: $(this).text(),
            mimeType: 'emoji'
        });
    });

    // 클릭 버튼
    $('div.btn_send').off('click').click(function (e) {
        chatHeight(false, true);
        channel.sendMessage({
            message: $('#content').text(),
            messageType: JSON.stringify({ profile: res.profile }),
            mimeType: "text"
        })
        $('#content').text('')
        $('#content').focus()
    })

    // 입력창 엔터
    $('#content').keydown(function (e) {
        if (e.keyCode == 13) {
            chatHeight(false, true);
            e.preventDefault();
            channel.sendMessage({
                message: $(this).text(),
                messageType: JSON.stringify({ profile: res.profile }),
                mimeType: "text"
            })
            $(this).text('');
        }
    })

    // 팝업 외 마우스 클릭 시 팝업 닫힘
    $(document).mouseup(function (e) {
        let container = $('.popupLayer');
        if (container.has(e.target).length === 0) {
            container.hide();
            $("#whisper").hide();
        }
    });


    // 신고하기
    // $('ul.popup_content li:nth-child(2)', popupLayer).click(function (e) {
    //     // API 콜한다
    //     // https://vchatcloud.com/api/openapi/insertChatBanUser
    //     const url = `${Util.Config.hostpath}openapi/insertChatBanUser`;

    //     let param = {
    //         "room_id": popupLayer.data()['roomId'],
    //         "buser_nick": popupLayer.data()['nickName'],
    //         "buser_msg": popupLayer.data()['message'],
    //         "buser_chat_id": popupLayer.data()['clientKey']
    //     };

    //     // js promise(요청을 보내놓고 뒷 코드가 계속 실행되기 원할때,,,,)
    //     $.post(url, param, function (data) {
    //         if (data.result_cd != 1) {
    //             toastr.error('추방 요청을 실패하였습니다.')
    //         } else {
    //             toastr.info('관리자에게 추방 요청하였습니다.');
    //         }
    //     }, "json");
    //     popupLayer.close();

    // });

    // 도움말 팝업 열기
    $('.help')
        .off('click')
        .click(function () {
            // 서랍 열려 있으면 닫기
            if (res.drawer.is(':visible')) {
                res.drawerClose()
            }
            $('.use_help').toggle();
        });

    // 도움말 팝업 닫기
    $('.btn_help_close')
        .off('click')
        .click(function () {
            $('.use_help').hide();
        });

    // 대화상대 목록에서 자동번역 ON/OFF시 html 변경
    $(document).on('change', '.chat-user-list-dim .chat-user .lang-btn', autoTranslateBtnHandler); // 일반

    // 자동 번역 선택 창 닫기
    $(document).on('click', '.chat-user-list-dim .select-lang-dim .select-lang-title p:last-child', autoTranslateWindowClose); // 일반

})

function openPopup(msg, callback, option) {
    let p = $('div.custompopup').hide();
    $('p:nth-child(1)', p).text(msg);
    $('a:nth-child(2)', p).off().click(function () { p.hide(); if (typeof callback == 'function') { callback("확인") } });
    if (option) {
        $('a:nth-child(3)', p).hide();
    } else {
        $('a:nth-child(3)', p).show();
        $('a:nth-child(3)', p).off().click(function () { p.hide(); if (typeof callback == 'function') { callback("취소") } });
    }
    p.show();
}

const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
    '{': '&#x7b;', // hex코드로 적어둠
    '}': '&#x7d;'
}; // hex코드로 적어둠

//태그 제한
function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, function (s) { return entityMap[s]; });
}
async function write(msg, tp, pre, sub) {

    sub = false

    if (msg.mimeType === 'file') {
        return fileWrite(msg, null, sub);
    }

    let cl = $('div.talk_field div.content1');
    let cc = $('<div>', { class: 'chat-content' });

    switch (tp) {
        case 'join':
            cc = $('<div>', { class: 'notice' });
            if (typeof msg == 'string') {
                cc.append($('<span>').html(msg));
            } else {
                console.log('msg',msg)
                if(msg.grade === 'userManager' && msg.mimeType !== undefined) {
                    cc.append($('<span><i class="fas fa-flag"></i></span>'));
                    cc.append($('<span>').html(typeof msg == 'string' ? msg : msg.message));
                } else {
                    cc.append($('<span>').html(msg.nickName + '님이 입장하셨습니다.'))
                }
            }
            break;
        case 'leave':
            cc = $('<div>', { class: 'notice' });
            cc.append($('<span>').html(msg.nickName + '님이 나가셨습니다.'));
            break;
        case 'notice':
            cc = $('<div>', { class: 'notice' });
            cc.append($('<span><i class="fas fa-flag"></i></span>'));
            cc.append($('<span>').html(typeof msg == 'string' ? msg : msg.message));
            break;
        case 'allExit':
            cc = $('<div>', { class: 'entery' });
            cc.append($('<span>').html('<b>채팅방을 종료합니다.</b>'));
            break;
        case 'userManager':
            cc = $('<div>', { class: 'notice' });
            if (typeof msg == 'string') {
                cc.append($('<span><i class="fas fa-flag"></i></span>'));
                cc.append($('<span>').html(msg));
            } else if (typeof msg == 'object' && msg.message) {
                if (channel.clientKey != msg.clientKey) {
                    cc = $('<div>', { class: 'opponent' });
                    cc.append(
                        $('<ul>')
                            .append($('<li>', { class: 'profile_img profile-admin', alt: 'opponent' }))
                    );
                    cc.append(
                        $('<ul>', { class: 'opponent_talk' })
                            .append($('<li>', { class: 'admin_kakao_name' }).html(msg.nickName))
                            .append($('<li class="admin_text_balloon">').text(msg.message))
                    );
                } else {
                    cc = $('<div>', { class: 'user' });
                    cc.append($('<div>')
                        .append($('<ul>')
                            .append($('<li>', { class: 'profile_img profile-admin', alt: 'user' })))
                        .append($('<ul>', { class: 'user_talk' })
                            .append($('<li>', { class: 'admin_kakao_name' }).html(msg.nickName))
                            .append($('<li class="admin_text_balloon">').text(msg.message)))
                    );
                }
            }
            break;
        case 'fileSend':
            let profile = 'profile-1';
            if (msg.profile) {
                profile = 'profile-' + msg.profile;
            }

            if (channel.clientKey != msg.clientKey) {
                cc = $('<div>', { class: 'opponent' });
                cc.append($('<div>').append($('<ul>').append($('<li>', { class: `profile_img ${profile}`, alt: 'opponent' })))
                    .append($('<ul>', { class: 'opponent_talk' })
                        .append($('<li>', { class: 'opponent_name' }).text(msg.nickName))))
            } else {
                cc = $('<div>', { class: 'user' });
                cc.append($('<div>').append($('<ul>').append($('<li>', { class: `profile_img ${profile}`, alt: 'user' })))
                    .append($('<ul>', { class: 'user_talk' })
                        .append($('<li>', { class: 'user_name' }).text(msg.nickName))))
            }

            if (msg.imgKey) {
                fileUtil.imgLoad(msg.imgKey, function (_img, button) {
                    cc.addClass('filesend')
                    cc.find('ul').eq(1).append(
                        msg.tag
                            .append(
                                $(_img).on('click', function () {
                                    let windowOpen = window.open('img.html');
                                    let openImgUrl = _img.src;
                                    windowOpen.addEventListener('load', function () {
                                        windowOpen.document.getElementById('target').src = openImgUrl;
                                    });
                                })
                            )
                            .append(button)
                    );
                    chatHeight(sub, true);
                });
            } else if (msg.vodKey) {
                fileUtil.vodLoad(msg.vodKey, function (vod, button) {
                    cc.append(msg.tag.append(vod).append(button));
                    chatHeight(sub, true);
                });
            } else if (msg.aodKey) {
                fileUtil.aodLoad(msg.aodKey, function (aod, button) {
                    cc.append(msg.tag.append(aod).append(button));
                    chatHeight(sub, true);
                });
            }
            cc.find('ul').eq(1).append(msg.tag);
            break;
        default:
            cc = $('<div>', { class: 'notice' });
            if (typeof msg == 'string') {
                let _msg = $(`<input value='${msg}' />`).val()
                cc.append($('<span>').html(escapeHtml(_msg)));
            } else if (typeof msg == 'object' && msg.message) {
                let _msg = $(`<input value='${msg.message}' />`).val()
                let profile = 'profile-1';
                if (msg.messageType) {
                    profile = 'profile-' + JSON.parse(msg.messageType).profile;
                }
                if (channel.clientKey != msg.clientKey) {
                    cc = $('<div>', { class: 'opponent' });
                    if (msg.mimeType === 'emoji_img') {
                        var html = $('<span>', { class: 'opponent' });
                        cc.append($('<ul>').append($('<li>', { class: `profile_img ${profile}`, alt: 'opponent' })))
                        cc.append($('<ul>', { class: 'opponent_talk' })
                            .append($('<li>', { class: 'opponent_name' }).html(msg.nickName))
                        ),
                            imgAppend(
                                msg.message,
                                function (_img) {
                                    cc.find('.opponent_talk').append(html.append(_img).css('margin-bottom', '0px'));
                                    chatHeight(sub, true);
                                },
                                function () { }
                            )

                    } else {
                        cc.append($('<ul>').append($('<li>', { class: `profile_img ${profile}`, alt: 'opponent' })))
                        cc.append($('<ul>', { class: 'opponent_talk' })
                            .append($('<li>', { class: 'opponent_name' }).html(msg.nickName))
                            .append($('<li class="opponent_text_balloon">').text(_msg)),
                            openGraph.getOpenGraph(msg.message, function (ogHtml, url, data) {
                                $(ogHtml).children('div').addClass('urlsend')
                                cc.find('.opponent_talk').append(ogHtml)
                                    .children('div')
                                    .on('click', function () {
                                        window.open(url);
                                    });
                                chatHeight(sub, true);
                            }
                            ))
                    }

                } else {
                    cc = $('<div>', { class: 'user' });
                    if (msg.mimeType === 'emoji_img') {
                        var html = $('<span>', { class: 'user' });
                        cc.append($('<div>')
                            .append($('<ul>')
                                .append($('<li>', { class: `profile_img ${profile}`, alt: 'user' })))
                            .append($('<ul>', { class: 'user_talk' })
                                .append($('<li>', { class: 'user_name' }).html(msg.nickName))
                            ),
                            imgAppend(
                                msg.message,
                                function (_img) {
                                    cc.find('.user_talk').append(html.append(_img).css('margin-bottom', '0px'));
                                    chatHeight(sub, true);
                                },
                                function () { }
                            )
                        );
                    } else {
                        cc.append($('<div>')
                            .append($('<ul>')
                                .append($('<li>', { class: `profile_img ${profile}`, alt: 'user' })))
                            .append($('<ul>', { class: 'user_talk' })
                                .append($('<li>', { class: 'user_name' }).html(msg.nickName))
                                .append($('<li class="user_text_balloon">').text(_msg)),
                                openGraph.getOpenGraph(msg.message, function (ogHtml, url, data) {
                                    console.log('data', data)
                                    $(ogHtml).children('div').addClass('urlsend')
                                    cc.find('.user_talk').append(ogHtml)
                                        .children('div')
                                        .on('click', function () {
                                            window.open(url);
                                        });
                                    chatHeight(sub, true);
                                })
                            )
                        )
                    }
                }
            }
    };
    if (pre) {
        cl.prepend(cc);
    } else {
        cl.append(cc);
    }
    $('div.talk_contents').scrollTop(cl.height());

    // 대화내용이 너무 많은경우 삭제처리
    if (sub) {
        if ($('.newchat-comment-wrap, .entery, .chatout, .notice, .whisper, .content', $('.newchat-chat-contents')).length > chatLimit) {
            $('.newchat-comment-wrap, .entery, .chatout, .notice, .whisper, .content', $('.newchat-chat-contents'))[0].remove();
        }
    } else {
        if ($('.entery, .chatout, .notice, .whisper, .content', $('#content1')).length > chatLimit) {
            $('.entery, .chatout, .notice, .whisper, .content', $('#content1'))[0].remove();
        }
    }
}

// 채팅 유저 목록 html 만들기
function chatUserListItem(clientKey, userInfo, nickName, isPrivate) {
    isPrivate = false
    let html = `
    <li class="chat-user" data-client-key="${clientKey}">
        <div class="user-profile-img profile-${userInfo?.profile}"></div>
        <div class="user-name">${nickName}</div>
        <div class="language">${userInfo?.lang && userInfo.lang !== 'none' ? trans.getLanguageName(userInfo.lang) : '번역안함'}</div>
        <div class="lang-btn-wrap">
          <input type="checkbox" class="lang-btn" id="${isPrivate === true ? 'private_' : ''}switch_${clientKey}" ${userInfo?.lang && userInfo?.lang !== 'none' ? 'checked' : ''
        }/>
          <label for="${isPrivate === true ? 'private_' : ''}switch_${clientKey}" class="switch_label">
            <span class="onf_btn"></span>
          </label>
        </div>
    </li>
    `;
    return $(html);
}

// 자동번역 스위치 ON 핸들러
function autoTranslateBtnHandler(e, isPrivate) {
    isPrivate = false
    if (e.target.tagName === 'INPUT') {
        const input = $(e.target);
        const clientKey = input.parent().parent().data('clientKey');
        const { userInfo } = isPrivate === true ? sub_user_info[clientKey] : user_info[clientKey];
        let userListWindow, langWindow, submitBtn, selectedInputRadio;
        if (input.is(':checked')) {
            if (!isPrivate) {
                userListWindow = '.chat-user-list-dim .select-lang-dim';
                langWindow = '.chat-user-list-dim .select-lang-dim .select-lang-list';
                submitBtn = '.chat-user-list-dim .select-lang-dim .select-lang-btn';
                selectedInputRadio = `.chat-user-list-dim .select-lang-dim input[name="target-lang"]:checked`;
            } else {
                userListWindow = '.newchat-popup-wrap .select-lang-dim';
                langWindow = '.newchat-popup-wrap .select-lang-dim .select-lang-list';
                submitBtn = '.newchat-popup-wrap .select-lang-dim .select-lang-btn';
                selectedInputRadio = `.newchat-popup-wrap .select-lang-dim input[name="target-lang"]:checked`;
            }
            // 언어 선택창 초기화
            $(userListWindow).toggleClass('active');
            $(langWindow).html(trans.makeLangHtml(userInfo?.lang));
            // 자동번역 언어 선택 후 등록 버튼
            $(submitBtn)
                .off()
                .on('click', function () {
                    userInfo.lang = $(selectedInputRadio).val();
                    allUserListUpdate(isPrivate);
                    $(userListWindow).removeClass('active');
                });
        } else {
            userInfo.lang = 'none';
            input.parent().parent().children('.language').html(`번역안함`);
        }
    }
}

// 번역 언어 선택창 닫기
function autoTranslateWindowClose(e, isPrivate) {
    isPrivate = false
    const x = $(e.target)
    x.parent().parent().parent().parent().removeClass('active')
    allUserListUpdate(isPrivate)
}

// 유저 정보 가져옴
function getUserInfo(clientKey, isPrivate) {
    isPrivate = false
    try {
        return isPrivate && isPrivate === true ? sub_user_info[clientKey]?.userInfo : user_info[clientKey]?.userInfo;
    } catch (error) {
        return undefined;
    }
}

// element의 부모중에 tag, class가 일치하는 부모 엘리먼트를 가져옴
function getParentElement(element, option) {
    const { tag, class: className } = option;

    try {
        if (tag) {
            if (element.tagName !== tag.toUpperCase()) {
                throw new Error();
            }
        }
        if (className) {
            if (!element.classList.contains(className)) {
                throw new Error();
            }
        }
        return element;
    } catch (error) {
        if (element.parentElement !== null) return getParentElement(element.parentElement, option);
        else throw new Error('더 이상 부모가 없습니다');
    }
}

// 자료실 초기화
async function resourceRepoInit(isPrivate) {
    isPrivate = false
    let resourceBtn, closeBtn, wrap;

    resourceBtn = '.gather-file_btn';
    closeBtn = '.gather-file-wrap .btn_gather_close';
    wrap = '.gather-file-wrap';
    content = '.mobile .video'
    chatField = '.talk_field'
    help = '.use_help'

    $(resourceBtn)
        .off()
        .on('click', (e) => {
            if (!$(wrap).is(':visible')) {
                resourceRepoInit();
            }
            // 도움말 펼쳐져 있으면 닫기
            if($(help).is(':visible')) {
                $(help).hide()
            }
            $(wrap).toggle();
            if ($(wrap).is(':visible')) {
                $(content).css('visibility', 'hidden')
            } else {
                $(content).css('visibility', 'visible')
            }
        });

    $(closeBtn)
        .off()
        .on('click', (e) => {
            $(wrap).toggle();
            $(content).css('visibility', 'visible')
        });

    let _channel = channel;

    const {
        result_msg,
        data: { list },
        result_cd,
    } = await $.ajax({
        type: 'post',
        url: `${Util.Config.hostpath}openapi/getFileList?roomId=${_channel.roomId}`,
    });

    if (list && result_cd === 1) {
        imageRepoInit(list);
        videoRepoInit(list);
        fileRepoInit(list);
    } else {
        console.error('요청에 실패했습니다.', result_msg);
    }
}

// 자료실 이미지 목록 초기화
async function imageRepoInit(array, isPrivate) {
    isPrivate = false
    // let _fileUtil = isPrivate === true ? subFileUtil : fileUtil;
    let _fileUtil = fileUtil;
    const images = array.filter(({ fileExt }) => _fileUtil.getFileType(fileExt) === 'image');
    let html = '',
        list,
        img,
        selectedCount,
        cancelBtn,
        downloadBtn;

    list = '.gather-file-wrap .file-content-wrap.image-wrap .file-preview-list';
    img = '.gather-file-wrap .file-content-wrap.image-wrap .file-preview-list .file-preview-image';
    selectedCount = '.gather-file-wrap .file-content-wrap.image-wrap .file-selet-count .select-count';
    cancelBtn = '.gather-file-wrap .file-content-wrap.image-wrap .fa-circle-xmark';
    downloadBtn = '.gather-file-wrap .file-content-wrap.image-wrap .file-down-btn';

    $(selectedCount).text(0);

    images.forEach((image, index) => {
        html += `<li class="file-preview-image" data-index="${index}">`;
        html += `<img src="${_fileUtil.download_url}?fileKey=${image.fileKey}" data-origin-file-nm="${image.originFileNm}">`;
        html += `</li>`;
    });
    $(list).html(html);

    let targetIndex = null;
    let shift = false;

    window.addEventListener('keydown', (e) => (shift = e.shiftKey));
    window.addEventListener('keyup', (e) => (shift = e.shiftKey));

    $(img)
        .off()
        .on('click', function (e) {
            const target = e.target.tagName === 'IMG' ? $(e.target).parent() : $(e.target);
            let newIndex = target.data('index');

            if (targetIndex !== null && shift) {
                targetIndex = parseInt(targetIndex);
                newIndex = parseInt(newIndex);
                $(`${img}[data-index="${targetIndex}"]`).toggleClass('active');
                if (targetIndex > newIndex) [newIndex, targetIndex] = [targetIndex, newIndex];
                for (targetIndex; targetIndex <= newIndex; targetIndex++) {
                    const selector = `${img}[data-index="${targetIndex}"]`;
                    $(selector).toggleClass('active');
                }
            } else {
                target.toggleClass('active');
            }

            targetIndex = target.data('index');

            $(selectedCount).text($(`${img}.active`).length);
        });

    $(cancelBtn)
        .off()
        .on('click', function (e) {
            $(img).removeClass('active');
            $(selectedCount).text('0');
        });

    $(downloadBtn)
        .off()
        .on('click', function (e) {
            const urls = $(`${img}.active img`)
                .toArray()
                .map((i) => {
                    return {
                        url: i.src,
                        name: i.dataset.originFileNm,
                    };
                });

            if (urls.length > 0) compressedZipDownload(urls, isPrivate);
        });
}

function subImageRepoInit(array) {
    imageRepoInit(array, true);
}

// 자료실 동영상 목록 초기화
function videoRepoInit(array, isPrivate) {
    isPrivate = false
    // let _fileUtil = isPrivate === true ? subFileUtil : fileUtil;
    let _fileUtil = fileUtil;
    const videos = array.filter(({ fileExt }) => _fileUtil.getFileType(fileExt) === 'video');
    let html = '',
        list,
        video,
        selectedCount,
        cancelBtn,
        downloadBtn;

    list = '.gather-file-wrap .file-content-wrap.vod-wrap .file-preview-list';
    video = '.gather-file-wrap .file-content-wrap.vod-wrap .file-preview-file';
    selectedCount = '.gather-file-wrap .file-content-wrap.vod-wrap .file-selet-count .select-count';
    cancelBtn = '.gather-file-wrap .file-content-wrap.vod-wrap .fa-circle-xmark';
    downloadBtn = '.gather-file-wrap .file-content-wrap.vod-wrap .file-down-btn';

    $(selectedCount).text(0);

    videos.forEach((video, index) => {
        html += `<li class="file-preview-file" data-index="${index}" data-file-key="${video.fileKey}">`;
        html += `<div class="gather-video-wrap">`;
        html += `<p class="gather-file-icon"><i class="fa-solid fa-video"></i></p>`;
        html += `<p class="gather-file-name">${video.originFileNm}</p>`;
        html += `<p class="gather-file-date">유효기간<span>${video.expire}</span></p>`;
        html += `<p class="gather-file-size">${video.fileSize > 1024 * 1024 ? (video.fileSize / 1024 / 1024).toFixed(2) + 'MB' : (video.fileSize / 1024).toFixed(2) + 'KB'
            }</p>`;
        html += `</div>`;
        html += `</li>`;
    });
    $(list).html(html);

    let targetIndex = null;
    let shift = false;

    window.addEventListener('keydown', (e) => (shift = e.shiftKey));
    window.addEventListener('keyup', (e) => (shift = e.shiftKey));

    $(video)
        .off()
        .on('click', function (e) {
            const target = $(getParentElement(e.target, { tag: 'li', class: 'file-preview-file' }));
            let newIndex = target.data('index');

            if (targetIndex !== null && shift) {
                targetIndex = parseInt(targetIndex);
                newIndex = parseInt(newIndex);
                $(`${video}[data-index="${targetIndex}"]`).toggleClass('active');
                if (targetIndex > newIndex) [newIndex, targetIndex] = [targetIndex, newIndex];
                for (targetIndex; targetIndex <= newIndex; targetIndex++) {
                    const selector = `${video}[data-index="${targetIndex}"]`;
                    $(selector).toggleClass('active');
                }
            } else {
                target.toggleClass('active');
            }

            targetIndex = target.data('index');

            $(selectedCount).text($(`${video}.active`).length);
        });

    $(cancelBtn)
        .off()
        .on('click', function (e) {
            $(video).removeClass('active');
            $(selectedCount).text('0');
        });

    $(downloadBtn)
        .off()
        .on('click', function (e) {
            const urls = $(`${video}.active`)
                .toArray()
                .map((v) => {
                    return {
                        url: `${_fileUtil.download_url}?fileKey=${v.dataset.fileKey}`,
                        name: $(v).children().children('.gather-file-name').text(),
                    };
                });

            if (urls.length > 0) compressedZipDownload(urls, isPrivate);
        });
}

function subVideoRepoInit(array) {
    videoRepoInit(array, true);
}

// 자료실 파일 목록 초기화
function fileRepoInit(array, isPrivate) {
    isPrivate = false
    // let _fileUtil = isPrivate === true ? subFileUtil : fileUtil;
    let _fileUtil = fileUtil;
    const files = array.filter(({ fileExt }) => _fileUtil.getFileType(fileExt) === 'file');
    let html = '',
        list,
        file,
        selectedCount,
        cancelBtn,
        downloadBtn;

    list = '.gather-file-wrap .file-content-wrap.file-wrap .file-preview-list';
    file = '.gather-file-wrap .file-content-wrap.file-wrap .file-preview-file';
    selectedCount = '.gather-file-wrap .file-content-wrap.file-wrap .file-selet-count .select-count';
    cancelBtn = '.gather-file-wrap .file-content-wrap.file-wrap .fa-circle-xmark';
    downloadBtn = '.gather-file-wrap .file-content-wrap.file-wrap .file-down-btn';

    $(selectedCount).text(0);

    files.forEach((file, index) => {
        html += `<li class="file-preview-file" data-index="${index}" data-file-key="${file.fileKey}">`;
        html += `<div class="gather-video-wrap">`;
        html += `<p class="gather-file-icon"><i class="${_fileUtil.fileExeCheck(file.fileExt)}"></i></p>`;
        html += `<p class="gather-file-name">${file.originFileNm}</p>`;
        html += `<p class="gather-file-date">유효기간<span>${file.expire}</span></p>`;
        html += `<p class="gather-file-size">${file.fileSize > 1024 * 1024 ? (file.fileSize / 1024 / 1024).toFixed(2) + 'MB' : (file.fileSize / 1024).toFixed(2) + 'KB'
            }</p>`;
        html += `</div>`;
        html += `</li>`;
    });
    $(list).html(html);

    let targetIndex = null;
    let shift = false;

    window.addEventListener('keydown', (e) => (shift = e.shiftKey));
    window.addEventListener('keyup', (e) => (shift = e.shiftKey));

    $(file)
        .off()
        .on('click', function (e) {
            const target = $(getParentElement(e.target, { tag: 'li', class: 'file-preview-file' }));
            let newIndex = target.data('index');

            if (targetIndex !== null && shift) {
                targetIndex = parseInt(targetIndex);
                newIndex = parseInt(newIndex);
                $(`${file}[data-index="${targetIndex}"]`).toggleClass('active');
                if (targetIndex > newIndex) [newIndex, targetIndex] = [targetIndex, newIndex];
                for (targetIndex; targetIndex <= newIndex; targetIndex++) {
                    const selector = `${file}[data-index="${targetIndex}"]`;
                    $(selector).toggleClass('active');
                }
            } else {
                target.toggleClass('active');
            }

            targetIndex = target.data('index');

            $(selectedCount).text($(`${file}.active`).length);
        });

    $(cancelBtn)
        .off()
        .on('click', function (e) {
            $(file).removeClass('active');
            $(selectedCount).text('0');
        });

    $(downloadBtn)
        .off()
        .on('click', function (e) {
            const urls = $(`${file}.active`)
                .toArray()
                .map((v) => {
                    return {
                        url: `${_fileUtil.download_url}?fileKey=${v.dataset.fileKey}`,
                        name: $(v).children().children('.gather-file-name').text(),
                    };
                });

            if (urls.length > 0) compressedZipDownload(urls, isPrivate);
        });
}

function subFileRepoInit(array) {
    fileRepoInit(array, true);
}

// 다중 파일시 압축 후 다운로드
async function compressedZipDownload(urls, isPrivate) {
    isPrivate = false
    let url,
        name = 'files.zip',
        wrap,
        progress,
        currentCount,
        totalCount,
        currentSize,
        totalSize,
        cancelBtn,
        closeBtn;

    wrap = `.downprogress_dim`;
    subtitle = `.downprogress_dim .downprogress_subtitle`;
    progress = `.downprogress_dim .downprogress_bar`;
    currentCount = `.downprogress_dim .current_contents`;
    totalCount = `.downprogress_dim .general_contents`;
    currentSize = `.downprogress_dim .current_volume`;
    totalSize = `.downprogress_dim .general_volume`;
    cancelBtn = `.downprogress_dim .down_cancel_btn`;
    closeBtn = `.downprogress_dim .close_ico`;

    // 프로그래스 창 초기화
    $(wrap).css('visibility', 'visible');
    $(`${cancelBtn}, ${closeBtn}`).show();
    $(currentCount).text(1);
    $(progress).val(0);
    $(currentSize).text(`${totalSize / 1024 / 1024 > 1 ? '0MB' : '0KB'}`);
    $(subtitle).text('선택한 파일을 저장하는 중입니다.');
    $(cancelBtn).text('취소');

    if (urls.length > 1) {
        const files = [];

        $(totalCount).text(urls.length);

        for (let i = 0; i < urls.length; i++) {
            $(progress).val(0);
            $(currentSize).text(`${totalSize / 1024 / 1024 > 1 ? '0MB' : '0KB'}`);
            const { url, name } = urls[i];
            try {
                const file = await fetcingData({ url, name, index: i }, isPrivate);
                files.push(file);
            } catch (error) {
                let i = 5;
                $(subtitle).text('요청을 취소하셨습니다. (5)');
                $(cancelBtn).text('닫기');
                const id = setInterval(() => {
                    i--;
                    if (i >= 0) {
                        $(subtitle).text(`요청을 취소하셨습니다. (${i})`);
                    } else {
                        $(cancelBtn).trigger('click');
                        clearInterval(id);
                    }
                }, 1000);

                $(`${cancelBtn}, ${closeBtn}`)
                    .off()
                    .on('click', () => {
                        clearInterval(id);
                        $(wrap).css('visibility', 'hidden');
                    });
                return;
            }
        }

        const zip = new JSZip();
        $(subtitle).text('다운로드한 파일을 압축중입니다.');
        $(`${cancelBtn}, ${closeBtn}`).hide();

        // 각각의 파일 압축
        for (let { blob, name } of files) {
            let i = 1;

            // 이름 중복 체크
            while (zip.file(name) !== null) {
                let [ext, ...baseName] = name.split('.').reverse();
                if (baseName[0].endsWith(`(${i})`)) {
                    baseName[0] = baseName[0].replace(`(${i})`, `(${i + 1})`);
                    i++;
                } else {
                    baseName[0] += ` (1)`;
                }

                name = [ext, ...baseName].reverse().join('.');
            }
            zip.file(name, blob);
        }

        const processUpdate = (meta) => $(progress).val(meta.percent);
        const blob = await zip.generateAsync({ type: 'blob' }, processUpdate);
        url = window.URL.createObjectURL(blob);
    } else {
        url = urls[0].url;
        name = urls[0].name;
    }

    download(url, name);

    window.URL.revokeObjectURL(url);

    $(wrap).css('visibility', 'hidden');
}

function subCompressedZipDownload(urls) {
    compressedZipDownload(urls, true);
}

// 일반 다운로드
function download(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.click();
    a.remove();
}

// 데이터 가져오기
async function fetcingData({ url, name, index }, isPrivate) {
    isPrivate = false
    let subtitle, progress, currentCount, currentSize, totalSize, cancelBtn, closeBtn;
    subtitle = `.downprogress_dim .downprogress_subtitle`;
    progress = `.downprogress_dim .downprogress_bar`;
    currentCount = `.downprogress_dim .current_contents`;
    currentSize = `.downprogress_dim .current_volume`;
    totalSize = `.downprogress_dim .general_volume`;
    cancelBtn = `.downprogress_dim .down_cancel_btn`;
    closeBtn = `.downprogress_dim .close_ico`;

    const cancel = new AbortController();
    $(`${cancelBtn}, ${closeBtn}`)
        .off()
        .on('click', () => {
            cancel.abort(); // throw DOMException
        });

    const response = await fetch(url, { signal: cancel.signal });
    let getSize = 0;
    const size = parseInt(response.headers.get('Content-Length'));
    const reader = response.body.getReader();
    const chunks = [];

    $(currentCount).text(index + 1);
    $(totalSize).text(`${size / 1024 / 1024 > 1 ? (size / 1024 / 1024).toFixed(1) + 'MB ' : (size / 1024).toFixed(1) + 'KB '}`);
    $(subtitle).text('선택한 파일을 저장하는 중입니다.');
    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            return {
                blob: new Blob(chunks),
                name: name,
            };
        }

        chunks.push(value);
        getSize += value.length;

        $(progress).val(((getSize / size) * 100).toFixed(0));
        $(currentSize).text(`${getSize / 1024 / 1024 > 1 ? ' ' + (getSize / 1024 / 1024).toFixed(1) + 'MB' : ' ' + (getSize / 1024).toFixed(1) + 'KB'}`);
    }
}

function chatInit() {

    // 룸이름 입력
    $('#roomNm').html(
        `<span class="roomNm_title">${channel.roomName}</span> <a class="chat-user-list_btn">(<i class="fas fa-user"></i>01 )</a><a class="gather-file_btn"><i class="fa-regular fa-folder-open"></i></a>`
    );

    // 유저리스트 팝업
    $('.chat-user-list_btn')
        .off('click')
        .on('click', function () {
            $('.chat-user-list-dim', $('.channel-popup-dim').addClass('active')).addClass('active');
            $('.talk_field > div.channel-popup-dim > div.chat-user-list-dim > div > div.chat-user-list-title > p:nth-child(2)')
                .off('click')
                .on('click', function () {
                    $('.chat-user-list-dim', $('.channel-popup-dim').removeClass('active')).removeClass('active');
                    // event_trigger(false);
                });
        });

    // 입력창 포커스
    $('#content').focus();
    allUserListUpdate();

    // 자료실 초기화
    resourceRepoInit();

    // 최상위채팅 margin-top 주기
    $('div.content1').find('div').eq(0).css('margin-top', '15px')

    // 신규 메시지 이벤트
    channel.onNotifyMessage = async function (event) {
        if (event.mimeType == 'file') {
            fileWrite(event);
        } else {
            if (event.grade == 'userManager') {
                write(event, 'userManager')
            } else {
                if (getUserInfo(event.clientKey)?.lang && getUserInfo(event.clientKey).lang !== 'none') {
                    // console.log('need translate >>>', getUserInfo(event.clientKey)?.lang, event.message);
                    const result = await trans.translate(event.message, getUserInfo(event.clientKey).lang, channel.roomId);
                    event.message = result.data || event.message;
                    // console.log('translated >>>', getUserInfo(event.clientKey)?.lang, result.data);
                }
                write(event)
            }
        }
    }

    // 중복 로그인시 이벤트
    channel.onPersonalDuplicateUser = function (event) {
        vChatCloud.disconnect();
        openError("중복 로그인으로 인해 로그아웃합니다.", function () {
            $('div.login').show();
            $('div.talk_field').hide();
        });
    }

    // 글쓰기 제한 이벤트
    channel.onPersonalMuteUser = function (event) {
        openError("글쓰기가 제한되었습니다.")
    }

    // 글쓰기 제한 해제 이벤트
    channel.onPersonalUnmuteUser = function (event) {
        openError("글쓰기 제한이 해제되었습니다.")
    }

    // 공지사항 메시지
    channel.onNotifyNotice = function (event) {
        write(event, 'join')
    }

    // 유저 입장
    channel.onNotifyJoinUser = function (event) {
        if (channel.clientKey != event.clientKey) {
            write(event, 'join')
        } else {
            scrollBotton()
        }
        allUserListUpdate()
    }

    // 유저 나감
    channel.onNotifyLeaveUser = function (event) {
        write(event, 'leave')
        allUserListUpdate()
    }

    // 유저 추방
    channel.onNotifyKickUser = function (event) {
        write("<font color='blue'><b>" + event.nickName + "</b></font> 님이 채팅방에서 추방되었습니다.");
    }

    // 유저 추방 해제
    channel.onNotifyUnkickUser = function (event) {
        write("<font color='blue'><b>" + event.nickName + "</b></font> 님이 채팅방에서 추방 해제되었습니다.");
    }

    // 글쓰기 제한
    channel.onNotifyMuteUser = function (event) {
        write("<font color='blue'><b>" + event.nickName + "</b></font> 님의 글쓰기가 제한되었습니다.");
    }

    // 글쓰기 제한 해제
    channel.onNotifyUnmuteUser = function (event) {
        write("<font color='blue'><b>" + event.nickName + "</b></font> 님의 글쓰기가 제한 해제되었습니다.");
    }

    // 커스텀 메시지
    channel.onNotifyCustom = function (event) {
        // {"roomId":"QljHXvApdB-hSKvfNLD2y-20200902153935","message":"{\"msg\":\"이벤트에 응모하시겠습니까?\",\"msgType\":\"event\",\"type\":\"popup\"}","nickName":"운영자","clientKey":"","mimeType":"text","messageDt":"20200904162501","messageCount":17}
        let custom = JSON.parse(event.message)
        if (custom.type == "allExit") {
            vChatCloud.disconnect() // 클라이언트에서 채팅방을 나갈수 있도록 한다.
            write(event, 'allExit')
            return;
        }
        try {
            if (event.type == "profile") {
                // profileJson[event.clientKey] = custom.profile;
                return;
            }
            if (custom.type == "popup") {
                openPopup(custom.msg, function (val) {
                }, false);
            } else if (custom.type == "notice") {
                write(custom.msg, 'notice')
            } else {
                openPopup(JSON.stringify(custom), function (val) {
                    console.log(val)
                }, true);
            }
        } catch (e) {
            openPopup(JSON.stringify(event.message), function (val) {
                console.log(val)
            }, true);
        }
    };
}

//  입장 유저 단위 변환
function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0';

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['', '천', '백만', '십억', '조'];
    let dmSize = '1'
    for (let i = 0; i < dm; i++) {
        dmSize += "0"
    }
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const number = Math.abs(bytes / Math.pow(k, i))
    const temp = number * Number(dmSize)
    const temp2 = Math.floor(temp)
    const result = temp2 / Number(dmSize)

    return result + sizes[i];
}

// 오브젝트 체크
function objectCheck(val) {
    if (typeof val === 'object') {
        return val;
    } else if (typeof val === 'string') {
        let _temp = val.replace(/{/g, '').replace(/}/g, '');
        let result = {};
        _temp = _temp.split(',');
        for (target in _temp) {
            result[_temp[target].split('=')[0]] = _temp[target].split('=')[1];
        }
        return result;
    } else {
        return null;
    }
}

// 채팅 인원 업데이트
function allUserListUpdate() {
    let new_user_info = {};
    user_list = [];
    channel.getAllUserList(function (err, list) {
        user_list = list;
        let count = 0;
        let el = $('div.chat-user-list-wrap div ul.chat-user-list').empty();
        user_list.forEach((val) => {
            if (user_info[val.clientKey]) Object.assign(val, user_info[val.clientKey]);
            new_user_info[val.clientKey] = val;
            let userInfo = objectCheck(val.userInfo);
            if (userInfo) {
                ++count;
                if (channel.clientKey != val.clientKey) {
                    // 채팅 대화상대 목록 그리기
                    let html = chatUserListItem(val.clientKey, userInfo, val.nickName);
                    el.append(html);
                }
            }
        });
        [user_info, new_user_info] = [new_user_info, null];
        let cnt = formatBytes(count, 1)
        $('a.chat-user-list_btn').html(`(<i class="fas fa-user"></i>${cnt.toString().padStart(2, '0')} )`);
    });
}

// 이미지 로딩 (url, load, error)
function imgAppend(src, onload, error) {
    var _img = new Image();
    _img.onload = function (e) {
        onload(_img, e);
    };
    _img.onerror = function (e) {
        error(e);
    };
    _img.src = src;
}

// 채팅창 높이 조절
function chatHeight(sub, pre) {
    if (sub) {
        subChatHeightEdit();
        if (pre) {
            subScrollBotton();
        }
    } else {
        chatHeightEdit();
        if (pre) {
            scrollBotton();
        }
    }
}

function subChatHeight(pre) {
    chatHeight(true, pre);
}

const getRoomId = () => {
    return privateChannel?.roomId;
};

function fileUpdate(flag, res, isPrivate) {
    isPrivate = false
    if (flag) {
        if (isPrivate) fileUtil.privateRoomId = getRoomId; //privateChannel.roomId;
        let param = [
            {
                id: res.fileKey,
                name: res.fileNm,
                type: res.fileExt,
                size: res.fileSize,
                expire: res.expire,
            },
        ];
        const data = {
            message: JSON.stringify(param),
            messageType: JSON.stringify({ profile: channel.userInfo.profile }),
            mimeType: 'file',
        };
        if (isPrivate === true) {
            subChatHeight(true);
            privateChannel.sendMessage(data);
        } else {
            chatHeight(false, true);
            channel.sendMessage(data);
        }
    } else {
        toastr.error('파일전송을 실패 했습니다.');
    }
}

function subFileUpdate(flag, res) {
    fileUpdate(flag, res, true);
}


function fileWrite(msg, pre, isPrivate) {
    isPrivate = false
    // 아직은 단일 파일만 적용
    let data = JSON.parse(msg.message)[0];

    if (data) {
        let param = {
            profile: JSON.parse(msg.messageType).profile,
            clientKey: msg.clientKey,
            nickName: msg.nickName,
        };
        fileUtil.loadCheck({
            ext: data.type,
            key: data.id,
            imgLoad: function (key) {
                param['imgKey'] = key;
                param['tag'] = $('<div>', { class: 'fileComment' });
                write(param, 'fileSend', pre, isPrivate);
            },
            vodLoad: function (key) {
                param['vodKey'] = key;
                param['tag'] = $('<div>', { class: 'fileComment' });
                write(param, 'fileSend', pre, isPrivate);
            },
            audioLoad: function (key) {
                param['aodKey'] = key;
                param['tag'] = $('<div>', { class: 'fileComment' });
                write(param, 'fileSend', pre, isPrivate);
            },
            fileLoad: function () {
                param['tag'] = fileUtil.fileInTag(data.name, data.type, `~ ${data.expire}`, data.size, data.id);
                write(param, 'fileSend', pre, isPrivate);
            },
        });
    }
}

function subFileWrite(msg, pre) {
    fileWrite(msg, pre, true);
}

// 채팅창 높이 조절
function chatHeightEdit(flag) {
    $('.talk_contents').css(
        'max-height',
        $('.talk_field').innerHeight() -
        // $('.talk_field .opponent_profile').innerHeight() -
        // $('.talk_field .chat_input_btn').innerHeight() -
        $('.talk_input').innerHeight() -
        10
    );
    if (chat_bottom || animate) {
        scrollBotton(flag);
    }
}
function subChatHeightEdit(flag) {
    $('.newchat-popup-contents').css(
        'max-height',
        $('#draggable').innerHeight() -
        $('.newchat-popup-title').innerHeight() -
        $('.newchat-popup-input').innerHeight() -
        // $('.newchat-popup-input-btn').innerHeight() -
        10
    );
    if (chat_bottom || animate) {
        subScrollBotton(flag);
    }
}


// 스크롤 최하단으로 이동
function scrollBotton(flag) {
    if (flag) {
        animate = true;
        $('.talk_contents')
            .stop(true)
            .animate({ scrollTop: $('div.content1').height() }, 380, function () {
                animate = false;
            });
    } else {
        $('.talk_contents').scrollTop($('div.content1').height());
    }
}