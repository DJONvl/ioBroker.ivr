// jQuery Plugin
(function($) {

    var cx = 0;
    var loopflag = false;
    jOrgChart_user_config_options = {};

    $.fn.jOrgChart = function(options) {

        var opts = $.extend({}, $.fn.jOrgChart.defaults, options);
        jOrgChart_user_config_options = opts;
        var $appendTo = $(opts.chartElement);

        // build the tree
        $this = $(this);
        $this.css("display", "none");
        var $container = $("<div class='" + opts.chartClass + "'/>");
        if ($this.is("ul")) {
            if (opts.rowcolor) {
                //add color to row wise 
                $this.find("li").each(function() {
                    classList = $(this).attr('class').split(/\s+/);
                    $.each(classList, function(index, item) {
                        if (item != "temp" && item != "node" && item != "child" && item != "ui-draggable" && item != "ui-droppable" && !/^unic\d+$/i.test(item)) {
                            re = item;
                        }
                    });
                    //if (re != null) {
                    //   $(this).removeClass(re)
                    // }

                    var col = $(this).parents('li').length;

                    if (col == 0) {
                        $(this).addClass("nrow");
                    } else if (col == 1) {
                        $(this).addClass("firow");
                    } else if (col == 2) {
                        $(this).addClass("serow");
                    } else if (col == 3) {
                        $(this).addClass("throw");
                    } else if (col == 4) {
                        $(this).addClass("forow");
                    } else if (col == 5) {
                        $(this).addClass("firow");
                    } else if (col == 6) {
                        $(this).addClass("sirow");
                    } else {
                        $(this).addClass("norow");
                    }

                });
            }
            $this.find("li.root").each(function() {
                buildNode($(this), $container, 0, opts);
            })
        } else if ($this.is("li")) {
            buildNode($this, $container, 0, opts);
        }
        $appendTo.append($container);

        // add drag and drop if enabled
        if (opts.dragAndDrop) {
            var $divNode = $('.node:not(.temp)').not(".disabled");
            var $divNode = $divNode.not($this.find(".node"))
            var $nodeParts = $divNode.not(".child");
            $divNode.draggable({
                cursor: 'move',
                distance: 40,
                helper: 'clone',
                opacity: 0.8,
                revert: 'invalid',
                revertDuration: 100,
                snap: 'div.node.expanded',
                snapMode: 'inner',
                stack: 'div.node'
            });

            $nodeParts.droppable({
                accept: '.node',
                activeClass: 'drag-active',
                hoverClass: 'drop-hover'
            });

            var $nodeCU = $("div.node.child");
            $nodeCU.droppable({
                accept: '.child',
                activeClass: 'drag-active',
                hoverClass: 'drop-hover'
            });

            // Drag start event handler for nodes

            $divNode.bind("dragstart", function handleDragStart(event, ui) {
                var start_event = ui.helper
                var sourceNode = $(this);
                if (start_event.is("div")) {
                    sourceNode.parentsUntil('.node-container').find('*').filter('.node').droppable({ disabled: true });
                } else if (start_event.is("li")) {
                    sourceNode.find('*').filter('.node').droppable({ disabled: true });
                }
            });


            // Drag stop event handler for nodes
            $divNode.bind("dragstop", function handleDragStop(event, ui) {

                //refresh side bar
                var sideLi = $("#upload-chart").html();
                $("#upload-chart").empty();
                $("#upload-chart").append(sideLi);
                if ($("#upload-chart li:last-child").hasClass("ui-draggable-dragging")) {
                    $("#upload-chart li:last-child").remove();
                }

                //remove list from side bar when added to org-chart
                if (removeside_node != "") {
                    $("#upload-chart #" + removeside_node).remove();
                    removeside_node = "";
                }

                /* reload the plugin */
                $(opts.chartElement).children().remove();
                $this.jOrgChart(opts);
                cutomdata();
            });


            // Drop event handler for nodes
            var removeside_node = ""
            $divNode.bind("drop", function handleDropEvent(event, ui) {

                var targetID = $(this).data("tree-node");
                var targetLi = $this.find("li").filter(function() {
                    return $(this).data("tree-node") === targetID;
                });
                var targetUl = targetLi.children('ul');

                var sourceID = ui.draggable.data("tree-node");
                if (sourceID == null) {
                    var lilength = $this.find("li").length;
                    var sourceLi = ui.draggable.clone().addClass('unic' + (lilength + 1));
                    removeside_node = ui.draggable.attr("id");
                    sourceLi.addClass("item");

                } else {
                    var sourceLi = $this.find("li").filter(function() {
                        return $(this).data("tree-node") === sourceID;
                    });
                    var sourceUl = sourceLi.parent('ul');
                    //Removes any empty lists
                    if (sourceUl.children().length === 0) {
                        sourceUl.remove();
                    }
                }

                sourceLi.removeClass("node").removeClass("ui-draggable")

                if (targetUl.length > 0) {
                    targetUl.append(sourceLi);
                } else {
                    targetLi.append("<ul></ul>");
                    targetLi.children('ul').append(sourceLi);
                }

            }); // handleDropEvent

        } // Drag and drop

        cutomdata();
    };

    // Option defaults
    $.fn.jOrgChart.defaults = {
        chartElement: 'body',
        depth: -1,
        chartClass: "jOrgChart",
        dragAndDrop: false,
        expand: false,
        control: false,
        rowcolor: false
    };

    var nodeCount = 0;

    function removeNode($node, opts, $nodeDiv) {
        if ($nodeDiv.hasClass("temp")) {
            if (click_flag) {
                $node.remove();
                click_flag = true;
                $(opts.chartElement).children().remove();
                $this.jOrgChart(opts);
            }

        }
    }

    // Method that recursively builds the tree
    function buildNode($node, $appendTo, level, opts) {
        var $table = $("<table cellpadding='0' cellspacing='0' border='0'/>");
        var $tbody = $("<tbody/>");

        // Construct the node container(s)
        var $nodeRow = $("<tr/>").addClass("node-cells");
        var $nodeCell = $("<td/>").addClass("node-cell").attr("colspan", 2);
        var $childNodes = $node.children("ul:first").children("li");
        var $nodeDiv;

        if ($childNodes.length > 1) {
            $nodeCell.attr("colspan", $childNodes.length * 2);
        }
        // Draw the node
        // Get the contents - any markup except li and ul allowed
        var $nodeContent = $node.clone()
            .children("ul,li")
            .remove()
            .end()
            .html();

        //Increaments the node count which is used to link the source list and the org chart
        nodeCount++;

        $node.data("tree-node", nodeCount);
        $nodeDiv = $("<div>").addClass("node")
            .data("tree-node", nodeCount)
            .append($nodeContent);


        $nodeDiv.append(
                "<div class='opciones'>" +
                "</div>")
            .mouseenter(function() {
                if ($(this).find("> .details > span").length == 0) {
                    var duplicate = $(this).find("> span.label_node").clone();
                    $(this).find("> .details").prepend(duplicate);
                }
                $(this).find(".details").toggle().parent().css("z-index", "999");
            }).mouseleave(function() {
                $(this).find(".details").toggle().parent().removeAttr("style");
            });

        var append_text = "<li class='temp'></li>";
        var $list_element = $node.clone()
            .children("ul,li")
            .remove()
            .end();


        // Expand and contract nodes
        if (opts.expand) {
            if ($childNodes.length > 0) {
                $nodeDiv.find(".opciones:eq(0)").closest(".node").append("<span class='exp-col'></span>");
                $nodeDiv.find(".exp-col").click(function() {
                    var $this = $(this);
                    var $tr = $this.closest("tr");
                    if ($tr.hasClass('contracted')) {
                        $tr.removeClass('contracted').addClass('expanded');
                        $tr.nextAll("tr").css('visibility', '');
                        $node.removeClass('collapsed');
                    } else {
                        $tr.removeClass('expanded').addClass('contracted');
                        $tr.nextAll("tr").css('visibility', 'hidden');
                        $node.addClass('collapsed');
                    }
                });
            }
        }

        $nodeCell.append($nodeDiv);
        $nodeRow.append($nodeCell);
        $tbody.append($nodeRow);

        if ($childNodes.length > 0) {
            // if it can be expanded then change the cursor
            //$nodeDiv.css('cursor','n-resize');

            // recurse until leaves found (-1) or to the level specified
            if (opts.depth == -1 || (level + 1 < opts.depth)) {
                var $downLineRow = $("<tr/>");
                var $downLineCell = $("<td/>").attr("colspan", $childNodes.length * 2);
                $downLineRow.append($downLineCell);

                // draw the connecting line from the parent node to the horizontal line
                $downLine = $("<div></div>").addClass("line down");
                $downLineCell.append($downLine);
                $tbody.append($downLineRow);

                // Draw the horizontal lines
                var $linesRow = $("<tr/>");
                $childNodes.each(function() {
                    var $left = $("<td>&nbsp;</td>").addClass("line left top");
                    var $right = $("<td>&nbsp;</td>").addClass("line right top");
                    $linesRow.append($left).append($right);
                });

                // horizontal line shouldn't extend beyond the first and last child branches
                $linesRow.find("td:first")
                    .removeClass("top")
                    .end()
                    .find("td:last")
                    .removeClass("top");

                $tbody.append($linesRow);
                var $childNodesRow = $("<tr/>");
                $childNodes.each(function() {
                    var $td = $("<td class='node-container'/>");
                    $td.attr("colspan", 2);
                    // recurse through children lists and items
                    buildNode($(this), $td, level + 1, opts);
                    $childNodesRow.append($td);
                });

            }
            $tbody.append($childNodesRow);
        }

        // any classes on the LI element get copied to the relevant node in the tree
        // apart from the special 'collapsed' class, which collapses the sub-tree at this point

        if ($node.attr('class') != undefined) {
            var classList = $node.attr('class').split(/\s+/);
            $.each(classList, function(index, item) {
                if (item == 'collapsed') {

                    $nodeRow.nextAll('tr').css('visibility', 'hidden');
                    $nodeRow.removeClass('expanded');
                    $nodeRow.addClass('contracted');
                } else {
                    $nodeDiv.addClass(item);
                }
            });
        }
        if (opts.control) {
            if (!$nodeDiv.hasClass("temp")) {
                $nodeDiv.find(".opciones:eq(0)").append("<span class='edit'></span>");
                $nodeDiv.find(".opciones:eq(0)").append("<span class='add'></span>");
                if ($nodeDiv.hasClass("child")) {
                    $nodeDiv.find(".opciones:eq(0)").append("<span class='del'></span>");
                }
            } else {
                $nodeDiv.find(".opciones:eq(0)").append("<span class='add'></span><span class='del'></span>");
            }
        }
        $table.append($tbody);
        $appendTo.append($table);

        /* Prevent trees collapsing if a link inside a node is clicked */
        $nodeDiv.children('a, span').click(function(e) {
            e.stopPropagation();
        });
    }

    function cutomdata(selector) {
        if (loopflag) {
            return;
        }
        loopActive = true;
        var regx = /\w*(row)/;

         //-- Delete node
        $(jOrgChart_user_config_options.chartElement).find(".del").off("click").on("click", function(e) {
            var nodo = $(this);

            if (!nodo.parent().parent().hasClass("temp")) {
                var nodeDiv = nodo.parent().parent();
                var cu = nodeDiv.find("a").attr("rel");
                var classList = nodeDiv.attr('class').split(/\s+/);
                var del_node;
                $.each(classList, function(index, item) {
                    if (item != "temp" && item != "node" && item != "child" && item != "ui-draggable" && item != "ui-droppable" && !regx.test(item)) {
                        del_node = item;
                    }
                });
                var element = $("li." + del_node + ":not('.temp, #upload-chart li')").removeAttr("class").addClass("node").addClass("child");
                remChild(element);
                jOrgChart_init();
            }
        });

        //-- Node editor
        $(jOrgChart_user_config_options.chartElement).find(".edit").off("click").on("click", function(e) {
            $("#fancy_edit").show();
            var classList = $(this).parent().parent().attr('class').split(/\s+/);
            var tipo_n;
            var del_node
            $.each(classList, function(index, item) {
                if (item != "temp" && item != "node" && item != "child" && item != "ui-draggable" && item != "ui-droppable" && !regx.test(item)) {
                    del_node = item;
                }
                if (item == "root" || item == "child") {
                    tipo_n = item;
                }
            });
            node_to_edit = $("li." + del_node + ":not('.temp')");
			var container=$(node_to_edit).children(".details" ).children("p");
		
			
			var unit= new Object();
					
				unit.id=container[0].innerHTML;
				unit.parent=container[1].innerHTML;				
				unit.caption=container[2].innerHTML;
				unit.triger=container[3].innerHTML;
				unit.respond=container[4].innerHTML;
				unit.s_var=container[5].innerHTML;
				unit.wtriger=container[6].innerHTML;			
			$( "input[name$='caption']" ).val(container[2].innerHTML);
			$( "input[name$='triger']" ).val(container[3].innerHTML);
			$( "input[name$='respond']" ).val(container[4].innerHTML);
			$( "input[name$='s_var']" ).val(container[5].innerHTML);			
			$( "input[name$='wtriger']" ).val(container[6].innerHTML);			
			
			
			
            $("#edit_node").off("click").on("click", function(e) {
                e.preventDefault();
                //modify li and refresh tree
                var edit_field = $("#edit_node_name");
                var edit_title = $("#edit_node_title");
                var texto = edit_field.val();
                var texti = edit_title.val();
                node_to_edit.find("> .label_node:eq(0) > a").text(texto);
                node_to_edit.find("> .label_node:eq(0) > i").text(texti);
				
			container[2].innerHTML=$( "input[name$='caption']" ).val();
			container[3].innerHTML=$( "input[name$='triger']" ).val();
			container[4].innerHTML=$( "input[name$='respond']" ).val();
			container[5].innerHTML=$( "input[name$='s_var']" ).val();			
			container[6].innerHTML=$( "input[name$='wtriger']" ).val();
				
				
				
                hideBox();
                jOrgChart_init();
            });
           // $("#fancy_edit").show();
			$('#fancy_edit').dialog("open");
        });


        //Add Node

        $(jOrgChart_user_config_options.chartElement).find(".add").off("click").on("click", function() {
            //$("#fancy_add i").show();
			$('#fancy_add').dialog("open");
            var classList = $(this).parent().parent().attr('class').split(/\s+/);
            var add_to_node;
            $.each(classList, function(index, item) {
                if (item != "temp" && item != "node" && item != "child" && item != "ui-draggable" && item != "ui-droppable" && !regx.test(item)) {
                    add_to_node = item;
                    return;
                }
            });
            $("#add_node").off("click").on("click", function(e) {
                e.preventDefault();

                var tipo_nodo = "";
                var text_field = $("#new_node_name");
                var text_description = $("#new_node_title");
                var texto = text_field.val();
                var texti = text_description.val();
                text_field.val("");
                text_description.val("");
                var $node = $("li." + add_to_node + ":not('.temp')");
                var childs = $this.find("li").size() + $("#upload-chart li").size() + 1;
                
				tipo_nodo += "child unic" + childs;
				var adtn=add_to_node;
				if(adtn== "root"){adtn="unic1"};
			var append_text="<li class='" + tipo_nodo +  "'>"+
							"<span class='label_node'><a>" +  texto + "</a></br><i>" + texti  + "</i></span>"+
							"<div class='details'>"+
							"<p>" + childs + "</p>"+
							"<p>" + adtn.substring(4) + "</p>"+								
							"<p>" + texto + "</p>"+
							"<p>" + texti + "</p>"+								
							"<p>" + "respond" + "</p>"+
							"<p>" + "s_var" + "</p>"+
							"<p>" + "wtriger" + "</p>"+
							
							"</div></li>";		
				
//                var append_text = "<li class='" + tipo_nodo + "'>";
//                append_text += "<span class='label_node'><a href='#'>" + texto + "</a><br><i>" + texti + "</i></span>";
//                append_text += "</li>";
                
				
				if ($node.find("ul").size() == 0) {
                    append_text = "<ul>" + append_text + "</ul>";
                    $node.append(append_text);
                } else {
                    $node.find("ul:eq(0)").append(append_text);
                }

                hideBox();
                jOrgChart_init();
            });
            $("#fancy_add").show();
        });


        function hideBox() {
            $("#fancy_edit, #fancy_add").hide();
        }

        $("#fancy_edit i,#fancy_add i").click(function() {
            hideBox();
        })

    }

    function remChild(removing) {
        if ($("#upload-chart").length) {
            $("#upload-chart").append(removing);
            //flatten value
            $("#upload-chart ul li").each(function() {
                var Orgli = $(this).removeAttr("class").addClass("node").addClass("child").clone();
                $(this).remove();
                $("#upload-chart").append(Orgli);
            });
            $("#upload-chart ul").remove();
            var sideLi = $("#upload-chart").html();
            $("#upload-chart").empty().append(sideLi);
        } else {
            removing.remove();
        }
    }

    var jOrgChart_init = function() {
        $(jOrgChart_user_config_options.chartElement).empty();
        $this.jOrgChart(jOrgChart_user_config_options);
    }

})(jQuery);
