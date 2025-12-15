<?xml version="1.0" encoding="UTF-8"?>
<!--
    Module XSLT Commun
    Fonctions et templates réutilisables pour les transformations IFCXML
-->

<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ifc="http://www.buildingsmart-tech.org/ifcXML/IFC4/final"
    xmlns:ifc2x3="http://www.iai-tech.org/ifcXML/IFC2x3/FINAL"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    exclude-result-prefixes="ifc ifc2x3 xlink">

    <!-- Fonction pour extraire le GUID d'un élément -->
    <xsl:function name="ifc:extract-guid" as="xs:string?">
        <xsl:param name="element" as="element()?"/>
        <xsl:choose>
            <xsl:when test="$element/@id">
                <xsl:value-of select="$element/@id"/>
            </xsl:when>
            <xsl:when test="$element//*[local-name()='GlobalId']">
                <xsl:value-of select="normalize-space($element//*[local-name()='GlobalId'][1])"/>
            </xsl:when>
        </xsl:choose>
    </xsl:function>

    <!-- Fonction pour extraire le nom -->
    <xsl:function name="ifc:extract-name" as="xs:string?">
        <xsl:param name="element" as="element()?"/>
        <xsl:variable name="name" select="$element//*[local-name()='Name']"/>
        <xsl:if test="$name and normalize-space($name)">
            <xsl:value-of select="normalize-space($name)"/>
        </xsl:if>
    </xsl:function>

    <!-- Fonction pour extraire la description -->
    <xsl:function name="ifc:extract-description" as="xs:string?">
        <xsl:param name="element" as="element()?"/>
        <xsl:variable name="desc" select="$element//*[local-name()='Description']"/>
        <xsl:if test="$desc and normalize-space($desc)">
            <xsl:value-of select="normalize-space($desc)"/>
        </xsl:if>
    </xsl:function>

    <!-- Fonction pour extraire une référence (href ou ref) -->
    <xsl:function name="ifc:extract-reference" as="xs:string?">
        <xsl:param name="element" as="element()?"/>
        <xsl:choose>
            <xsl:when test="$element/@href">
                <xsl:value-of select="substring-after($element/@href, '#')"/>
            </xsl:when>
            <xsl:when test="$element/@ref">
                <xsl:value-of select="$element/@ref"/>
            </xsl:when>
        </xsl:choose>
    </xsl:function>

    <!-- Template pour créer un objet JSON d'entité de base -->
    <xsl:template name="ifc:entity-object">
        <xsl:param name="element" as="element()"/>
        <xsl:param name="type" as="xs:string"/>
        
        <xsl:variable name="guid" select="ifc:extract-guid($element)"/>
        <xsl:variable name="name" select="ifc:extract-name($element)"/>
        <xsl:variable name="description" select="ifc:extract-description($element)"/>
        
        <xsl:if test="$guid">
            <string key="guid"><xsl:value-of select="$guid"/></string>
            <string key="type"><xsl:value-of select="$type"/></string>
            <xsl:if test="$name">
                <string key="name"><xsl:value-of select="$name"/></string>
            </xsl:if>
            <xsl:if test="$description">
                <string key="description"><xsl:value-of select="$description"/></string>
            </xsl:if>
        </xsl:if>
    </xsl:template>

    <!-- Template pour créer un tableau JSON -->
    <xsl:template name="ifc:array">
        <xsl:param name="items" as="item()*"/>
        <array>
            <xsl:for-each select="$items">
                <xsl:copy-of select="."/>
            </xsl:for-each>
        </array>
    </xsl:template>

    <!-- Template pour créer un objet JSON -->
    <xsl:template name="ifc:object">
        <xsl:param name="content" as="item()*"/>
        <map>
            <xsl:copy-of select="$content"/>
        </map>
    </xsl:template>

</xsl:stylesheet>





